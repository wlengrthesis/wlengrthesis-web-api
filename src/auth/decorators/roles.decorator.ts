import { SetMetadata } from '@nestjs/common';
import { Role } from '../auth.types';

export const ROLES = 'ROLES';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
