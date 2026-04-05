import type {ReactNode} from "react";

interface MainLayoutProps {
    children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => (
    <div className="w-full">
        {children}
    </div>
);
