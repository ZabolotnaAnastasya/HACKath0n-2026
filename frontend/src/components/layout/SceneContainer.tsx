import { ReactNode } from "react";

interface SceneContainerProps {
    children: ReactNode;
}

export const SceneContainer = ({ children }: SceneContainerProps) => (
    <div className="flex-1 bg-black rounded-[2px] overflow-hidden min-w-0">
        {children}
    </div>
);
