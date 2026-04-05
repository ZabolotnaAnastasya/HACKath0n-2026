import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { TrajectoryPoint, CameraPosition } from "../types/trajectory";

interface TrajectoryBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

export const calculateTrajectoryBounds = (points: TrajectoryPoint[]): TrajectoryBounds => {
    if (points.length === 0) {
        return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);

    return {
        minX: Math.min(...xValues),
        maxX: Math.max(...xValues),
        minY: Math.min(...yValues),
        maxY: Math.max(...yValues),
        minZ: Math.min(...zValues),
        maxZ: Math.max(...zValues)
    };
};

export const scaleTrajectoryToGrid = (points: TrajectoryPoint[], targetSize: number = 20): {
    scaledPoints: THREE.Vector3[];
    axisScales: { x: number; y: number; z: number };
} => {
    if (points.length === 0) {
        return { scaledPoints: [], axisScales: { x: 1, y: 1, z: 1 } };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);

    const dataMinX = Math.min(...xValues);
    const dataMaxX = Math.max(...xValues);
    const dataMinY = Math.min(...yValues);
    const dataMaxY = Math.max(...yValues);
    const dataMinZ = Math.min(...zValues);
    const dataMaxZ = Math.max(...zValues);

    const rangeX = dataMaxX - dataMinX || 1;
    const rangeY = dataMaxY - dataMinY || 1;
    const rangeZ = dataMaxZ - dataMinZ || 1;

    const axisScales = {
        x: targetSize / rangeX,
        y: targetSize / rangeY,
        z: targetSize / rangeZ
    };

    const scaledPoints = points.map(p => new THREE.Vector3(
        p.x * axisScales.x,
        p.y * axisScales.y,
        p.z * axisScales.z
    ));

    return {
        scaledPoints,
        axisScales
    };
};

export const setupCameraForTopView = (gridSize: number = 20): CameraPosition => {
    return {
        x: 0,
        y: 0,
        z: gridSize * 1.5
    };
};

interface CreateSceneParams {
    container: HTMLDivElement;
    cameraPosition: CameraPosition;
}

interface CreateSceneReturn {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    raycaster: THREE.Raycaster;
}

export const createScene = ({ container, cameraPosition }: CreateSceneParams): CreateSceneReturn => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    const raycaster = new THREE.Raycaster();

    return { scene, camera, renderer, controls, raycaster };
};

const calculateNiceStep = (range: number, targetDivisions: number = 8): number => {
    if (range <= 0) return 1;
    
    const roughStep = range / targetDivisions;
    const exponent = Math.floor(Math.log10(roughStep));
    const fraction = roughStep / Math.pow(10, exponent);
    
    let niceFraction: number;
    if (fraction < 1.5) {
        niceFraction = 1;
    } else if (fraction < 3) {
        niceFraction = 2;
    } else if (fraction < 7) {
        niceFraction = 5;
    } else {
        niceFraction = 10;
    }
    
    return niceFraction * Math.pow(10, exponent);
};

const createBillboardLabel = (text: string, size: number = 0.5): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = 128;
    canvas.height = 64;
    
    context.font = 'bold 42px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.strokeStyle = 'black';
    context.lineWidth = 3;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    context.fillStyle = 'white';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.5
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size * 0.5, 1);
    
    return sprite;
};

const checkLabelCollision = (pos1: THREE.Vector3, pos2: THREE.Vector3, threshold: number = 1.0): boolean => {
    return pos1.distanceTo(pos2) < threshold;
};

const isWithinGridBounds = (pos: THREE.Vector3, bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }, margin: number = 0.5): boolean => {
    return pos.x >= bounds.minX - margin && pos.x <= bounds.maxX + margin &&
           pos.y >= bounds.minY - margin && pos.y <= bounds.maxY + margin &&
           pos.z >= bounds.minZ - margin && pos.z <= bounds.maxZ + margin;
};

const clampToGridBounds = (pos: THREE.Vector3, bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }, margin: number = 0.5): THREE.Vector3 => {
    return new THREE.Vector3(
        Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, pos.x)),
        Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, pos.y)),
        Math.max(bounds.minZ + margin, Math.min(bounds.maxZ - margin, pos.z))
    );
};

interface AxisScales {
    x: number;
    y: number;
    z: number;
}

export const createDataDrivenGridRulers = (
    scaledPoints?: THREE.Vector3[],
    originalPoints?: TrajectoryPoint[],
    axisScales?: AxisScales,
    providedGridBounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): THREE.Group => {
    const group = new THREE.Group();
    
    let rawMinX = 0, rawMaxX = 0, rawMinY = 0, rawMaxY = 0, rawMinZ = 0, rawMaxZ = 0;
    let scales: AxisScales = axisScales || { x: 1, y: 1, z: 1 };
    
    const targetSize = 20;
    const visualPadding = 0.15;
    
    if (originalPoints && originalPoints.length > 0) {
        const xValues = originalPoints.map(p => p.x);
        const yValues = originalPoints.map(p => p.y);
        const zValues = originalPoints.map(p => p.z);
        
        rawMinX = Math.min(...xValues);
        rawMaxX = Math.max(...xValues);
        rawMinY = Math.min(...yValues);
        rawMaxY = Math.max(...yValues);
        rawMinZ = Math.min(...zValues);
        rawMaxZ = Math.max(...zValues);
        
        if (!axisScales) {
            const xRange = (rawMaxX - rawMinX) || 1;
            const yRange = (rawMaxY - rawMinY) || 1;
            const zRange = (rawMaxZ - rawMinZ) || 1;
            
            scales = {
                x: targetSize / xRange,
                y: targetSize / yRange,
                z: targetSize / zRange
            };
        }
    } else {
        rawMinX = -10; rawMaxX = 10;
        rawMinY = -10; rawMaxY = 10;
        rawMinZ = -10; rawMaxZ = 10;
    }
    
    let gridBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    
    if (providedGridBounds) {
        gridBounds = providedGridBounds;
    } else {
        const visualMinX = rawMinX * scales.x * (1 - visualPadding);
        const visualMaxX = rawMaxX * scales.x * (1 + visualPadding);
        const visualMinY = rawMinY * scales.y * (1 - visualPadding);
        const visualMaxY = rawMaxY * scales.y * (1 + visualPadding);
        const visualMinZ = rawMinZ * scales.z * (1 - visualPadding);
        const visualMaxZ = rawMaxZ * scales.z * (1 + visualPadding);
        
        gridBounds = {
            minX: visualMinX,
            maxX: visualMaxX,
            minY: visualMinY,
            maxY: visualMaxY,
            minZ: visualMinZ,
            maxZ: visualMaxZ
        };
    }
    
    const maxSceneRange = Math.max(
        gridBounds.maxX - gridBounds.minX,
        gridBounds.maxY - gridBounds.minY,
        gridBounds.maxZ - gridBounds.minZ
    );
    
    const xDataRange = (rawMaxX - rawMinX) * (1 + visualPadding);
    const yDataRange = (rawMaxY - rawMinY) * (1 + visualPadding);
    const zDataRange = (rawMaxZ - rawMinZ) * (1 + visualPadding);
    
    const xStep = calculateNiceStep(xDataRange, 6);
    const yStep = calculateNiceStep(yDataRange, 6);
    const zStep = calculateNiceStep(zDataRange, 6);
    
    const gridDivisions = 20;
    const xyGridSize = Math.max(
        gridBounds.maxX - gridBounds.minX,
        gridBounds.maxY - gridBounds.minY
    );
    const xyGrid = new THREE.GridHelper(xyGridSize, gridDivisions, 0x444444, 0x222222);
    xyGrid.rotation.x = Math.PI / 2;
    xyGrid.position.set(
        (gridBounds.minX + gridBounds.maxX) / 2,
        (gridBounds.minY + gridBounds.maxY) / 2,
        0
    );
    group.add(xyGrid);
    
    const labelPositions: THREE.Vector3[] = [];
    
    const addLabel = (text: string, position: THREE.Vector3, bounds: typeof gridBounds): THREE.Sprite | null => {
        if (!isWithinGridBounds(position, bounds, 0.3)) {
            position = clampToGridBounds(position, bounds, 0.3);
        }
        
        if (labelPositions.some(pos => checkLabelCollision(pos, position, 0.8))) {
            return null;
        }
        
        const label = createBillboardLabel(text, 0.6);
        label.position.copy(position);
        label.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
        labelPositions.push(position.clone());
        return label;
    };
    
    const zAxisGroup = new THREE.Group();
    
    const zAxisGeometry = new THREE.BufferGeometry();
    zAxisGeometry.setFromPoints([
        new THREE.Vector3(0, 0, gridBounds.minZ),
        new THREE.Vector3(0, 0, gridBounds.maxZ)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxisGroup.add(zAxisLine);
    
    const zStart = Math.ceil((gridBounds.minZ / scales.z) / zStep) * zStep;
    const zEnd = Math.floor((gridBounds.maxZ / scales.z) / zStep) * zStep;
    
    for (let currentZ = zStart; currentZ <= zEnd; currentZ += zStep) {
        if (Math.abs(currentZ) < zStep * 0.001) continue;
        
        const sceneZ = currentZ * scales.z;
        
        if (sceneZ < gridBounds.minZ || sceneZ > gridBounds.maxZ) continue;
        
        const tickGeometry = new THREE.BufferGeometry();
        tickGeometry.setFromPoints([
            new THREE.Vector3(-0.3, 0, sceneZ),
            new THREE.Vector3(0.3, 0, sceneZ)
        ]);
        const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        const tickLine = new THREE.Line(tickGeometry, tickMaterial);
        zAxisGroup.add(tickLine);
        
        let labelPos = new THREE.Vector3(0.8, 0, sceneZ);
        const label = addLabel(String(Math.round(currentZ)), labelPos, gridBounds);
        if (label) zAxisGroup.add(label);
    }
    
    group.add(zAxisGroup);
    
    const xAxisGroup = new THREE.Group();
    const xAxisGeometry = new THREE.BufferGeometry();
    xAxisGeometry.setFromPoints([
        new THREE.Vector3(gridBounds.minX, 0, 0.02),
        new THREE.Vector3(gridBounds.maxX, 0, 0.02)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxisGroup.add(xAxisLine);
    
    const xStart = Math.ceil((gridBounds.minX / scales.x) / xStep) * xStep;
    const xEnd = Math.floor((gridBounds.maxX / scales.x) / xStep) * xStep;
    
    for (let currentX = xStart; currentX <= xEnd; currentX += xStep) {
        if (Math.abs(currentX) < xStep * 0.001) continue;
        
        const sceneX = currentX * scales.x;
        
        if (sceneX < gridBounds.minX || sceneX > gridBounds.maxX) continue;
        
        const tickGeometry = new THREE.BufferGeometry();
        tickGeometry.setFromPoints([
            new THREE.Vector3(sceneX, 0, -0.3 + 0.02),
            new THREE.Vector3(sceneX, 0, 0.3 + 0.02)
        ]);
        const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        const tickLine = new THREE.Line(tickGeometry, tickMaterial);
        xAxisGroup.add(tickLine);
        
        let labelPos = new THREE.Vector3(sceneX, 0, 0.8);
        const label = addLabel(String(Math.round(currentX)), labelPos, gridBounds);
        if (label) xAxisGroup.add(label);
    }
    
    group.add(xAxisGroup);
    
    const yAxisGroup = new THREE.Group();
    const yAxisGeometry = new THREE.BufferGeometry();
    yAxisGeometry.setFromPoints([
        new THREE.Vector3(0, gridBounds.minY, 0.02),
        new THREE.Vector3(0, gridBounds.maxY, 0.02)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    yAxisGroup.add(yAxisLine);
    
    const yStart = Math.ceil((gridBounds.minY / scales.y) / yStep) * yStep;
    const yEnd = Math.floor((gridBounds.maxY / scales.y) / yStep) * yStep;
    
    for (let currentY = yStart; currentY <= yEnd; currentY += yStep) {
        if (Math.abs(currentY) < yStep * 0.001) continue;
        
        const sceneY = currentY * scales.y;
        
        if (sceneY < gridBounds.minY || sceneY > gridBounds.maxY) continue;
        
        const tickGeometry = new THREE.BufferGeometry();
        tickGeometry.setFromPoints([
            new THREE.Vector3(-0.3, sceneY, 0.02),
            new THREE.Vector3(0.3, sceneY, 0.02)
        ]);
        const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        const tickLine = new THREE.Line(tickGeometry, tickMaterial);
        yAxisGroup.add(tickLine);
        
        let labelPos = new THREE.Vector3(0.8, sceneY, 0);
        const label = addLabel(String(Math.round(currentY)), labelPos, gridBounds);
        if (label) yAxisGroup.add(label);
    }
    
    group.add(yAxisGroup);
    
    const originLabel = createBillboardLabel('0', 0.8);
    originLabel.position.set(0.5, 0, 0.5);
    originLabel.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
    group.add(originLabel);
    
    return group;
};

export const createGrid = (): THREE.Group => {
    return createDataDrivenGridRulers();
};

interface CreateSphereParams {
    point: TrajectoryPoint;
    index: number;
    totalPoints: number;
    scaledPosition: THREE.Vector3;
    normalizedTime: number;
}

export const createSphere = ({ point, index, totalPoints, scaledPosition, normalizedTime }: CreateSphereParams): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(0.025, 8, 8);

    let r, g, b;
    if (normalizedTime < 0.5) {
        const localT = normalizedTime * 2;
        r = localT;
        g = localT * 0.8;
        b = 1 - localT;
    } else {
        const localT = (normalizedTime - 0.5) * 2;
        r = 1;
        g = 0.8 * (1 - localT);
        b = 0;
    }

    const color = new THREE.Color(r, g, b);

    if (index === 0) color.set(0x0000ff);
    else if (index === totalPoints - 1) color.set(0xff0000);

    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(scaledPosition);

    sphere.userData = {
        ...point,
        baseColor: color.getHex(),
        id: `${point.x}_${point.y}_${point.z}_${point.time_s}`
    };

    return sphere;
};

export const createColoredTrajectoryLine = (
    points: TrajectoryPoint[],
    scaledPoints: THREE.Vector3[]
): THREE.Line | null => {
    if (points.length < 2 || scaledPoints.length < 2) return null;

    const positions: number[] = [];
    const colors: number[] = [];
    const minTime = Math.min(...points.map(p => p.time_s));
    const maxTime = Math.max(...points.map(p => p.time_s));
    const timeRange = maxTime - minTime || 1;

    for (let i = 0; i < points.length; i++) {
        const p = scaledPoints[i];
        positions.push(p.x, p.y, p.z);

        const normalizedTime = (points[i].time_s - minTime) / timeRange;

        let r, g, b;
        if (normalizedTime < 0.5) {
            const localT = normalizedTime * 2;
            r = localT;
            g = localT * 0.8;
            b = 1 - localT;
        } else {
            const localT = (normalizedTime - 0.5) * 2;
            r = 1;
            g = 0.8 * (1 - localT);
            b = 0;
        }
        colors.push(r, g, b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2
    });

    return new THREE.Line(geometry, material);
};

export const createTrajectoryTubes = (points: TrajectoryPoint[], scaledPoints: THREE.Vector3[]): THREE.Mesh[] => {
    if (points.length < 2) return [];

    const tubes: THREE.Mesh[] = [];
    const minTime = Math.min(...points.map(p => p.time_s));
    const maxTime = Math.max(...points.map(p => p.time_s));
    const timeRange = maxTime - minTime || 1;

    for (let i = 0; i < points.length - 1; i++) {
        const startPoint = points[i];
        const endPoint = points[i + 1];
        const scaledStart = scaledPoints[i];
        const scaledEnd = scaledPoints[i + 1];

        const curve = new THREE.LineCurve3(scaledStart, scaledEnd);

        const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.04, 8, false);

        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const positions = tubeGeometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);

        for (let j = 0; j < positions.count; j++) {
            const t = j / (positions.count - 1);
            const timeAtPosition = startPoint.time_s + t * (endPoint.time_s - startPoint.time_s);
            const normalizedTime = (timeAtPosition - minTime) / timeRange;

            let r, g, b;

            if (normalizedTime < 0.5) {
                const localT = normalizedTime * 2;
                r = localT;
                g = localT * 0.8;
                b = 1 - localT;
            } else {
                const localT = (normalizedTime - 0.5) * 2;
                r = 1;
                g = 0.8 * (1 - localT);
                b = 0;
            }

            colors[j * 3] = r;
            colors[j * 3 + 1] = g;
            colors[j * 3 + 2] = b;
        }

        tubeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const tube = new THREE.Mesh(tubeGeometry, material);
        tube.userData = { startPoint, endPoint, type: 'trajectoryTube' };
        tubes.push(tube);
    }

    return tubes;
};

export const getMousePosition = (event: MouseEvent, rect: DOMRect) => ({
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
});

export const updateSphereColor = (sphere: THREE.Mesh, activePointId: string | null) => {
    const material = sphere.material as THREE.MeshBasicMaterial;
    const sphereId = sphere.userData.id as string;

    if (activePointId && sphereId === activePointId) {
        material.color.set(0x00ff00);
    } else {
        material.color.set(sphere.userData.baseColor as number);
    }
};

export const getPointId = (point: TrajectoryPoint): string =>
    `${point.x}_${point.y}_${point.z}_${point.time_s}`;

export const calculateGridBounds = (
    points: TrajectoryPoint[],
    axisScales: { x: number; y: number; z: number },
    padding: number = 0.15
) => {
    if (points.length === 0) {
        return { minX: -10, maxX: 10, minY: -10, maxY: 10, minZ: -10, maxZ: 10 };
    }
    
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);
    
    const rawMinX = Math.min(...xValues);
    const rawMaxX = Math.max(...xValues);
    const rawMinY = Math.min(...yValues);
    const rawMaxY = Math.max(...yValues);
    const rawMinZ = Math.min(...zValues);
    const rawMaxZ = Math.max(...zValues);
    
    return {
        minX: rawMinX * axisScales.x * (1 - padding),
        maxX: rawMaxX * axisScales.x * (1 + padding),
        minY: rawMinY * axisScales.y * (1 - padding),
        maxY: rawMaxY * axisScales.y * (1 + padding),
        minZ: rawMinZ * axisScales.z * (1 - padding),
        maxZ: rawMaxZ * axisScales.z * (1 + padding)
    };
};

export const clampTrajectoryToBounds = (
    points: THREE.Vector3[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): THREE.Vector3[] => {
    return points.map(p => new THREE.Vector3(
        Math.max(bounds.minX, Math.min(bounds.maxX, p.x)),
        Math.max(bounds.minY, Math.min(bounds.maxY, p.y)),
        Math.max(bounds.minZ, Math.min(bounds.maxZ, p.z))
    ));
};