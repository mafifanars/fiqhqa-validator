
"use client";

import { useState, useEffect } from 'react';
import { TimerIcon } from 'lucide-react';

type TimerProps = {
    startTime: number;
};

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export function Timer({ startTime }: TimerProps) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.round((now - startTime) / 1000);
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [startTime]);

    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded-md">
            <TimerIcon className="h-3 w-3" />
            <span>{formatTime(elapsedTime)}</span>
        </div>
    );
}
