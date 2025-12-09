import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SetupStatus {
    is_complete: boolean;
    missing_binary: boolean;
    missing_model: boolean;
    detected_gpu: string;
    recommended_variant: string; // "cuda", "rocm", "cpu"
}

export function useSmartSetup() {
    const [status, setStatus] = useState<SetupStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await invoke<SetupStatus>('check_setup_status');
            setStatus(res);
            return res;
        } catch (e) {
            console.error("Setup check failed:", e);
            setError(String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { status, loading, error, checkStatus };
}
