export function validatePermissions(
  requiredPermission: string,
  userPermissions: {
    prefix: string;
    method: string | string[];
  }[],
): boolean {
  if (!requiredPermission || requiredPermission.length === 0) {
    return true;
  }

  const [reqPrefix, reqMethod] = requiredPermission.toLowerCase().split('_');
  return userPermissions.some((perm) => {
    const userPrefix = perm.prefix?.toLowerCase();
    if (userPrefix !== reqPrefix) return false;

    if (Array.isArray(perm.method)) {
      return perm.method.some((m) => m.toLowerCase() === reqMethod);
    }

    return `${userPrefix}_${perm.method?.toLowerCase()}` === requiredPermission.toLowerCase();
  });
}