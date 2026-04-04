import { useThreeScene } from "../../hooks/useThreeScene";

export const TrajectoryScene = () => {
    const { mountRef } = useThreeScene();
    return <div ref={mountRef} className="w-full h-full bg-black rounded-[2px] overflow-hidden" />;
};