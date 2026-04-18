import type { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response) {
    res.status(200).json({
        status: 'UP',
        service: 'frienddrop-host-agent',
        timestamp: new Date().toISOString(),
    });
}
