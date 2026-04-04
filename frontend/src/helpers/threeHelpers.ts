import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { TrajectoryPoint, CameraPosition } from "../types/trajectory";

// ---------- Bounds & Scaling ----------

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

export const scaleTrajectoryToGrid = (points: TrajectoryPoint[], gridSize: number = 20): {
    scaledPoints: THREE.Vector3[];
    scale: number;
} => {
    if (points.length === 0) {
        return { scaledPoints: [], scale: 1 };
    }

    // Use first point as reference (align with grid center at 0,0,0)
    const firstPoint = points[0];
    
    // Calculate ranges relative to first point
    const xValues = points.map(p => p.x - firstPoint.x);
    const yValues = points.map(p => p.y - firstPoint.y);
    const zValues = points.map(p => p.z - firstPoint.z);

    const rangeX = Math.max(...xValues) - Math.min(...xValues) || 1;
    const rangeY = Math.max(...yValues) - Math.min(...yValues) || 1;
    const rangeZ = Math.max(...zValues) - Math.min(...zValues) || 1;

    // Use the largest range for uniform scaling
    const maxRange = Math.max(rangeX, rangeY, rangeZ);
    const scale = (gridSize * 0.8) / maxRange;

    // Scale points relative to first point (which will be at 0,0,0)
    const scaledPoints = points.map(p => new THREE.Vector3(
        (p.x - firstPoint.x) * scale,
        (p.y - firstPoint.y) * scale,
        (p.z - firstPoint.z) * scale
    ));

    return {
        scaledPoints,
        scale
    };
};

// ---------- Camera Setup ----------

export const setupCameraForTopView = (gridSize: number = 20): CameraPosition => {
    return {
        x: 0,
        y: 0,
        z: gridSize * 1.5 // Top-down view
    };
};

// ---------- Scene Creation ----------

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
    
    // Set camera for Z-up coordinate system (Z is vertical upward)
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1); // Z is up

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    
    // Camera constraints for Z-up system
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    const raycaster = new THREE.Raycaster();

    return { scene, camera, renderer, controls, raycaster };
};

// ---------- Grid ----------

// Nice Numbers Algorithm for dynamic step calculation
const calculateNiceStep = (range: number, targetDivisions: number = 8): number => {
    if (range <= 0) return 1;
    
    // Calculate the rough step size
    const roughStep = range / targetDivisions;
    
    // Determine the exponent (order of magnitude)
    const exponent = Math.floor(Math.log10(roughStep));
    
    // Calculate the fraction
    const fraction = roughStep / Math.pow(10, exponent);
    
    // Snap to human-friendly values: {1,2,5,10,20,50,100,200,500,1000...}
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

// Create text sprite with black outline for maximum contrast
const createBillboardLabel = (text: string, size: number = 0.5): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = 128;
    canvas.height = 64;
    
    context.font = 'bold 42px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Black outline for contrast
    context.strokeStyle = 'black';
    context.lineWidth = 3;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    // White fill
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

// Check for label collisions in screen space
const checkLabelCollision = (pos1: THREE.Vector3, pos2: THREE.Vector3, threshold: number = 1.0): boolean => {
    return pos1.distanceTo(pos2) < threshold;
};

// Mathematical coordinate grid measurement system
export const createDataDrivenGridRulers = (scaledPoints?: THREE.Vector3[], originalPoints?: TrajectoryPoint[]): THREE.Group => {
    const group = new THREE.Group();
    
    // DATA-DRIVEN BOUNDING BOX - Calculate from raw dataset
    let dataMinX = 0, dataMaxX = 0, dataMinY = 0, dataMaxY = 0, dataMinZ = 0, dataMaxZ = 0;
    let sceneScale = 1;
    
    if (originalPoints && originalPoints.length > 0) {
        // Calculate raw data bounds directly from dataset
        const xValues = originalPoints.map(p => p.x);
        const yValues = originalPoints.map(p => p.y);
        const zValues = originalPoints.map(p => p.z);
        
        dataMinX = Math.min(...xValues);
        dataMaxX = Math.max(...xValues);
        dataMinY = Math.min(...yValues);
        dataMaxY = Math.max(...yValues);
        dataMinZ = Math.min(...zValues);
        dataMaxZ = Math.max(...zValues);
        
        // Add 20% padding to extend grid beyond data
        const xPadding = (dataMaxX - dataMinX) * 0.2;
        const yPadding = (dataMaxY - dataMinY) * 0.2;
        const zPadding = (dataMaxZ - dataMinZ) * 0.2;
        
        dataMinX -= xPadding;
        dataMaxX += xPadding;
        dataMinY -= yPadding;
        dataMaxY += yPadding;
        dataMinZ -= zPadding;
        dataMaxZ += zPadding;
        
        // Calculate scene scaling factor if we have scaled points
        if (scaledPoints && scaledPoints.length > 0) {
            const scaledXValues = scaledPoints.map(p => p.x);
            const scaledYValues = scaledPoints.map(p => p.y);
            const scaledZValues = scaledPoints.map(p => p.z);
            
            const scaledXRange = Math.max(...scaledXValues) - Math.min(...scaledXValues);
            const scaledYRange = Math.max(...scaledYValues) - Math.min(...scaledYValues);
            const scaledZRange = Math.max(...scaledZValues) - Math.min(...scaledZValues);
            
            const dataXRange = dataMaxX - dataMinX;
            const dataYRange = dataMaxY - dataMinY;
            const dataZRange = dataMaxZ - dataMinZ;
            
            const maxDataRange = Math.max(dataXRange, dataYRange, dataZRange);
            const maxScaledRange = Math.max(scaledXRange, scaledYRange, scaledZRange);
            
            sceneScale = maxScaledRange / maxDataRange;
        }
    } else {
        // Fallback to default bounds when no data
        dataMinX = -10; dataMaxX = 10;
        dataMinY = -10; dataMaxY = 10;
        dataMinZ = -10; dataMaxZ = 10;
    }
    
    // Calculate data ranges for Nice Numbers algorithm
    const xDataRange = dataMaxX - dataMinX;
    const yDataRange = dataMaxY - dataMinY;
    const zDataRange = dataMaxZ - dataMinZ;
    
    // Dynamic step calculation using Nice Numbers algorithm
    const xStep = calculateNiceStep(xDataRange);
    const yStep = calculateNiceStep(yDataRange);
    const zStep = calculateNiceStep(zDataRange);
    
    // UNIFIED STEP: Use largest step for spatial symmetry
    const unifiedStep = Math.max(xStep, yStep, zStep);
    
    // Create base XY grid (rotated to XY plane)
    const xyGrid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    xyGrid.rotation.x = Math.PI / 2;
    group.add(xyGrid);
    
    // Track label positions for collision culling
    const labelPositions: THREE.Vector3[] = [];
    
    // Z-AXIS: Vertical pole with data-driven bounds
    const zAxisGroup = new THREE.Group();
    
    // Main Z-axis line covering data bounds
    const zAxisGeometry = new THREE.BufferGeometry();
    zAxisGeometry.setFromPoints([
        new THREE.Vector3(0, 0, dataMinZ * sceneScale),
        new THREE.Vector3(0, 0, dataMaxZ * sceneScale)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxisGroup.add(zAxisLine);
    
    // Z-axis tick marks and labels using data-driven iteration
    const startZ = Math.floor(dataMinZ / unifiedStep) * unifiedStep;
    for (let currentZ = startZ; currentZ <= dataMaxZ; currentZ += unifiedStep) {
        // Skip origin (handled separately)
        if (Math.abs(currentZ) < unifiedStep * 0.001) continue;
        
        // Scene position (scaled)
        const sceneZ = currentZ * sceneScale;
        
        // Horizontal tick mark
        const tickGeometry = new THREE.BufferGeometry();
        tickGeometry.setFromPoints([
            new THREE.Vector3(-0.3, 0, sceneZ),
            new THREE.Vector3(0.3, 0, sceneZ)
        ]);
        const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
        const tickLine = new THREE.Line(tickGeometry, tickMaterial);
        zAxisGroup.add(tickLine);
        
        // Label position
        const labelPos = new THREE.Vector3(0.8, 0, sceneZ);
        
        // Collision culling
        if (labelPositions.some(pos => checkLabelCollision(pos, labelPos))) continue;
        
        // Create label with RAW data coordinate (not scaled)
        const label = createBillboardLabel(String(Math.round(currentZ)), 0.6);
        label.position.copy(labelPos);
        label.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
        zAxisGroup.add(label);
        
        labelPositions.push(labelPos);
    }
    
    group.add(zAxisGroup);
    
    // X-axis labels using data-driven iteration
    const startX = Math.floor(dataMinX / unifiedStep) * unifiedStep;
    for (let currentX = startX; currentX <= dataMaxX; currentX += unifiedStep) {
        // Skip origin (handled separately)
        if (Math.abs(currentX) < unifiedStep * 0.001) continue;
        
        // Scene position (scaled)
        const sceneX = currentX * sceneScale;
        
        const labelPos = new THREE.Vector3(sceneX, 0, 0.3);
        
        // Collision culling
        if (labelPositions.some(pos => checkLabelCollision(pos, labelPos))) continue;
        
        // Create label with RAW data coordinate
        const label = createBillboardLabel(String(Math.round(currentX)), 0.6);
        label.position.copy(labelPos);
        label.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
        group.add(label);
        
        labelPositions.push(labelPos);
    }
    
    // Y-axis labels using data-driven iteration
    const startY = Math.floor(dataMinY / unifiedStep) * unifiedStep;
    for (let currentY = startY; currentY <= dataMaxY; currentY += unifiedStep) {
        // Skip origin (handled separately)
        if (Math.abs(currentY) < unifiedStep * 0.001) continue;
        
        // Scene position (scaled)
        const sceneY = currentY * sceneScale;
        
        const labelPos = new THREE.Vector3(0.3, sceneY, 0);
        
        // Collision culling
        if (labelPositions.some(pos => checkLabelCollision(pos, labelPos))) continue;
        
        // Create label with RAW data coordinate
        const label = createBillboardLabel(String(Math.round(currentY)), 0.6);
        label.position.copy(labelPos);
        label.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
        group.add(label);
        
        labelPositions.push(labelPos);
    }
    
    // SINGLE ORIGIN LABEL - exactly one at (0,0,0)
    const originLabel = createBillboardLabel('0', 0.8);
    originLabel.position.set(0, 0, 0.4);
    originLabel.userData = { alwaysFaceCamera: true, type: 'gridLabel' };
    group.add(originLabel);
    
    return group;
};

export const createGrid = (): THREE.Group => {
    return createDataDrivenGridRulers();
};

// ---------- Spheres ----------

interface CreateSphereParams {
    point: TrajectoryPoint;
    index: number;
    totalPoints: number;
    scaledPosition: THREE.Vector3;
}

export const createSphere = ({ point, index, totalPoints, scaledPosition }: CreateSphereParams): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(0.0475, 12, 12);
    let color = 0xffffff;
    if (index === 0) color = 0x0000ff;
    else if (index === totalPoints - 1) color = 0xff0000;

    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(scaledPosition);

    sphere.userData = {
        ...point,
        baseColor: color,
        id: `${point.x}_${point.y}_${point.z}_${point.time_s}`
    };

    return sphere;
};

// ---------- Trajectory Line ----------

export const createTrajectoryLine = (scaledPoints: THREE.Vector3[]): THREE.Line | null => {
    if (scaledPoints.length < 2) return null;

    const positions: number[] = [];
    scaledPoints.forEach(p => positions.push(p.x, p.y, p.z));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
};

// ---------- Trajectory Tubes ----------

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

        // Create smoother tube geometry with more segments
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

// ---------- Utility Functions ----------

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