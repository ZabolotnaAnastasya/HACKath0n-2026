import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
    createScene,
    createGrid,
    createSphere,
    createColoredTrajectoryLine,
    getMousePosition,
    updateSphereColor,
    getPointId,
    scaleTrajectoryToGrid,
    createDataDrivenGridRulers,
    calculateGridBounds,
    clampTrajectoryToBounds
} from "../helpers/threeHelpers.ts";
import type { TrajectoryPoint } from "../types";
import { useTrajectoryStore } from "../stores/useTrajectoryStore";

interface UseThreeSceneReturn {
    mountRef: React.RefObject<HTMLDivElement | null>;
}

export const useThreeScene = (): UseThreeSceneReturn => {
    const mountRef = useRef<HTMLDivElement>(null);
    const spheresRef = useRef<THREE.Mesh[]>([]);
    const lineRef = useRef<THREE.Line | null>(null);
    const hoveredRef = useRef<THREE.Mesh | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const gridRef = useRef<THREE.Group | null>(null);

    const {
        trajectoryArray,
        cameraPosition,
        setCameraPosition,
        activePoint,
        setActivePoint,
        setIsLoading
    } = useTrajectoryStore();

    const activePointRef = useRef<TrajectoryPoint | null>(activePoint);
    const hasSetInitialPointRef = useRef(false);

    useEffect(() => {
        activePointRef.current = activePoint;
    }, [activePoint]);

    const updateSphereColors = useCallback(() => {
        const activeId = activePoint ? getPointId(activePoint) : null;
        spheresRef.current.forEach((sphere) => {
            updateSphereColor(sphere, activeId);
        });
    }, [activePoint]);

    useEffect(() => {
        updateSphereColors();
    }, [updateSphereColors]);

    useEffect(() => {
        if (!mountRef.current) return;

        console.log("[ThreeScene] Initializing scene");
        const { scene, camera, renderer, controls, raycaster } = createScene({
            container: mountRef.current,
            cameraPosition,
            onCameraChange: setCameraPosition
        });

        sceneRef.current = scene;
        rendererRef.current = renderer;
        controlsRef.current = controls;

        controls.addEventListener("change", () => {
            setCameraPosition({
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            });
        });

        const grid = createGrid();
        scene.add(grid);
        gridRef.current = grid;

        const mouse = new THREE.Vector2();

        const handleMove = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const { x, y } = getMousePosition(event, rect);
            mouse.set(x, y);

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(spheresRef.current);

            if (intersects.length > 0) {
                const obj = intersects[0].object as THREE.Mesh;
                renderer.domElement.style.cursor = "pointer";

                if (hoveredRef.current !== obj) {
                    if (hoveredRef.current) {
                        updateSphereColor(
                            hoveredRef.current,
                            activePointRef.current ? getPointId(activePointRef.current) : null
                        );
                    }
                    hoveredRef.current = obj;
                    (obj.material as THREE.MeshBasicMaterial).color.set(0x00ff00);
                }
            } else {
                renderer.domElement.style.cursor = "default";
                if (hoveredRef.current) {
                    updateSphereColor(
                        hoveredRef.current,
                        activePointRef.current ? getPointId(activePointRef.current) : null
                    );
                    hoveredRef.current = null;
                }
            }
        };

        const handleClick = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const { x, y } = getMousePosition(event, rect);
            mouse.set(x, y);

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(spheresRef.current);

            if (intersects.length > 0) {
                const point = intersects[0].object.userData as TrajectoryPoint;
                setActivePoint(point);
            }
        };

        renderer.domElement.addEventListener("mousemove", handleMove);
        renderer.domElement.addEventListener("click", handleClick);

        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            controls.update();
            
            scene.traverse((child) => {
                if (child instanceof THREE.Sprite && child.userData.alwaysFaceCamera) {
                    child.quaternion.copy(camera.quaternion);
                }
            });
            
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.domElement.removeEventListener("mousemove", handleMove);
            renderer.domElement.removeEventListener("click", handleClick);
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            controls.dispose();
            renderer.dispose();
            scene.clear();
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        const controls = controlsRef.current;
        if (!scene) return;

        console.log("[ThreeScene] Updating trajectoryArray, setting isLoading = true");
        setIsLoading(true);

        spheresRef.current.forEach((sphere) => {
            scene.remove(sphere);
            sphere.geometry.dispose();
            (sphere.material as THREE.Material).dispose();
        });

        lineRef.current?.geometry.dispose();
        (lineRef.current?.material as THREE.Material)?.dispose();

        const oldLine = scene.children.find((child) => child instanceof THREE.Line);
        if (oldLine) {
            scene.remove(oldLine);
            (oldLine as THREE.Line).geometry.dispose();
            ((oldLine as THREE.Line).material as THREE.Material).dispose();
        }

        const { scaledPoints, axisScales } = scaleTrajectoryToGrid(trajectoryArray);
        const gridBounds = calculateGridBounds(trajectoryArray, axisScales, 0.15);
        const clampedPoints = clampTrajectoryToBounds(scaledPoints, gridBounds);

        if (gridRef.current) {
            scene.remove(gridRef.current);
            gridRef.current.traverse((child) => {
                if (child instanceof THREE.GridHelper) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                } else if (child instanceof THREE.Sprite) {
                    (child.material as THREE.SpriteMaterial).map?.dispose();
                    (child.material as THREE.Material).dispose();
                } else if (child instanceof THREE.Line) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
        }

        const grid = createDataDrivenGridRulers(clampedPoints, trajectoryArray, axisScales, gridBounds);
        scene.add(grid);
        gridRef.current = grid;

        const minTime = Math.min(...trajectoryArray.map(p => p.time_s));
        const maxTime = Math.max(...trajectoryArray.map(p => p.time_s));
        const timeRange = maxTime - minTime || 1;

        const spheres: THREE.Mesh[] = trajectoryArray.map((point, index) =>
            createSphere({ 
                point, 
                index, 
                totalPoints: trajectoryArray.length,
                scaledPosition: clampedPoints[index],
                normalizedTime: (point.time_s - minTime) / timeRange
            })
        );
        spheres.forEach((sphere) => scene.add(sphere));
        spheresRef.current = spheres;

        const line = createColoredTrajectoryLine(trajectoryArray, clampedPoints);
        if (line) {
            scene.add(line);
            lineRef.current = line;
        }

        if (trajectoryArray.length > 0 && !hasSetInitialPointRef.current) {
            const firstPoint = trajectoryArray[0];
            setActivePoint(firstPoint);
            if (controls) controls.target.copy(clampedPoints[0]);
            hasSetInitialPointRef.current = true;
        } else if (activePoint && controls) {
            const activeIndex = trajectoryArray.findIndex(p => 
                p.x === activePoint.x && p.y === activePoint.y && p.z === activePoint.z && p.time_s === activePoint.time_s
            );
            if (activeIndex >= 0) {
                controls.target.copy(clampedPoints[activeIndex]);
            }
        }

        updateSphereColors();
        setIsLoading(false);
        console.log("[ThreeScene] Trajectory update complete, isLoading = false");
    }, [trajectoryArray]);

    useEffect(() => {
        hasSetInitialPointRef.current = false;
    }, [trajectoryArray]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls || !activePoint || trajectoryArray.length === 0) return;

        console.log("[ThreeScene] Updating camera target to active point:", activePoint);
        
        const { scaledPoints, axisScales } = scaleTrajectoryToGrid(trajectoryArray);
        const gridBounds = calculateGridBounds(trajectoryArray, axisScales, 0.15);
        const clampedPoints = clampTrajectoryToBounds(scaledPoints, gridBounds);
        const activeIndex = trajectoryArray.findIndex(p => 
            p.x === activePoint.x && p.y === activePoint.y && p.z === activePoint.z && p.time_s === activePoint.time_s
        );
        
        if (activeIndex >= 0) {
            const currentTarget = controls.target.clone();
            const targetPosition = clampedPoints[activeIndex];
            
            const transitionDuration = 0.5;
            const startTime = Date.now();
            
            const smoothTransition = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / transitionDuration, 1);
                
                const easedProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                controls.target.lerpVectors(currentTarget, targetPosition, easedProgress);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(smoothTransition);
                }
            };
            
            smoothTransition();
        }
    }, [activePoint, trajectoryArray]);

    return { mountRef };
};