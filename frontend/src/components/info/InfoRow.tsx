interface InfoRowProps {
    label: string;
    value: string | number;
}

export const InfoRow = ({ label, value }: InfoRowProps) => (
    <div>
        {label}: {value}
    </div>
);
