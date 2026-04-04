import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
    createScene,
    createGrid,
    createSphere,
    createTrajectoryLine,
    createTrajectoryTubes,
    getMousePosition,
    updateSphereColor,
    getPointId,
    scaleTrajectoryToGrid,
    setupCameraForTopView,
    createDataDrivenGridRulers
} from "../helpers/threeHelpers.ts";
import type { TrajectoryPoint } from "../types";
import { useTrajectoryStore } from "../stores/useTrajectoryStore";

interface UseThreeSceneReturn {
    mountRef: React.RefObject<HTMLDivElement | null>;
}

export const useThreeScene = (): UseThreeSceneReturn => {
    const mountRef = useRef<HTMLDivElement>(null);
    const spheresRef = useRef<THREE.Mesh[]>([]);
    const tubesRef = useRef<THREE.Mesh[]>([]);
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
            
            // Update camera-facing sprites (grid labels)
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

    // Оновлення сфери та лінії при зміні trajectoryArray
    useEffect(() => {
        const scene = sceneRef.current;
        const controls = controlsRef.current;
        if (!scene) return;

        console.log("[ThreeScene] Updating trajectoryArray, setting isLoading = true");
        setIsLoading(true);

        // Видаляємо старі сфери
        spheresRef.current.forEach((sphere) => {
            scene.remove(sphere);
            sphere.geometry.dispose();
            (sphere.material as THREE.Material).dispose();
        });

        // Видаляємо старі трубки
        tubesRef.current.forEach((tube) => {
            scene.remove(tube);
            tube.geometry.dispose();
            (tube.material as THREE.Material).dispose();
        });

        // Видаляємо стару лінію (залишимо для сумісності)
        const oldLine = scene.children.find((child) => child instanceof THREE.Line);
        if (oldLine) {
            scene.remove(oldLine);
            (oldLine as THREE.Line).geometry.dispose();
            ((oldLine as THREE.Line).material as THREE.Material).dispose();
        }

        // Scale trajectory to fit within grid (relative to origin)
        const { scaledPoints } = scaleTrajectoryToGrid(trajectoryArray);

        // Remove old grid and create new data-driven one with actual data
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

        // Create grid with labels based on actual trajectory data
        const grid = createDataDrivenGridRulers(scaledPoints, trajectoryArray);
        scene.add(grid);
        gridRef.current = grid;

        // Створюємо нові сфери
        const spheres: THREE.Mesh[] = trajectoryArray.map((point, index) =>
            createSphere({ 
                point, 
                index, 
                totalPoints: trajectoryArray.length,
                scaledPosition: scaledPoints[index]
            })
        );
        spheres.forEach((sphere) => scene.add(sphere));
        spheresRef.current = spheres;

        // Створюємо трубки замість лінії
        const tubes = createTrajectoryTubes(trajectoryArray, scaledPoints);
        tubes.forEach((tube) => scene.add(tube));
        tubesRef.current = tubes;

        // Встановлюємо початкову активну точку
        if (trajectoryArray.length > 0 && !hasSetInitialPointRef.current) {
            const firstPoint = trajectoryArray[0];
            setActivePoint(firstPoint);
            if (controls) controls.target.copy(scaledPoints[0]);
            hasSetInitialPointRef.current = true;
        } else if (activePoint && controls) {
            const activeIndex = trajectoryArray.findIndex(p => 
                p.x === activePoint.x && p.y === activePoint.y && p.z === activePoint.z && p.time_s === activePoint.time_s
            );
            if (activeIndex >= 0) {
                controls.target.copy(scaledPoints[activeIndex]);
            }
        }

        updateSphereColors();
        setIsLoading(false);
        console.log("[ThreeScene] Trajectory update complete, isLoading = false");
    }, [trajectoryArray]);

    useEffect(() => {
        hasSetInitialPointRef.current = false;
    }, [trajectoryArray]);

    // Update camera target when active point changes
    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls || !activePoint || trajectoryArray.length === 0) return;

        console.log("[ThreeScene] Updating camera target to active point:", activePoint);
        
        // Find the scaled position of the active point
        const { scaledPoints } = scaleTrajectoryToGrid(trajectoryArray);
        const activeIndex = trajectoryArray.findIndex(p => 
            p.x === activePoint.x && p.y === activePoint.y && p.z === activePoint.z && p.time_s === activePoint.time_s
        );
        
        if (activeIndex >= 0) {
            // Smoothly transition camera target to active point
            const currentTarget = controls.target.clone();
            const targetPosition = scaledPoints[activeIndex];
            
            // Simple smooth transition
            const transitionDuration = 0.5; // seconds
            const startTime = Date.now();
            
            const smoothTransition = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / transitionDuration, 1);
                
                // Ease-in-out function
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