export interface Persona {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  metadata: Record<string, unknown>;
}

export interface CreatePersonaInput {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdatePersonaInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
}
