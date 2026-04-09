import type { FastifyReply, FastifyRequest } from 'fastify';

export function requireSharedSecret(
  request: FastifyRequest,
  reply: FastifyReply,
  sharedSecret: string
): boolean {
  const authHeader = request.headers['x-telemetry-secret'];

  if (authHeader === sharedSecret) {
    return true;
  }

  void reply.code(401).send({
    error: 'Unauthorized'
  });

  return false;
}
