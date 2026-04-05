import type { ReactNode } from "react";

interface SidebarProps {
    children: ReactNode;
}

export const Sidebar = ({ children }: SidebarProps) => (
    <div className="w-64 border-3 p-4 border-r-4 border-dashed flex flex-col gap-4 flex-shrink-0">
        {children}
    </div>
);
