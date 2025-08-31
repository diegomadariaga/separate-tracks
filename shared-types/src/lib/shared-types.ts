
// Ejemplo de tipo compartido
export interface User {
  id: string;
  name: string;
  email: string;
}

export function sharedTypes(): string {
  return 'shared-types';
}
