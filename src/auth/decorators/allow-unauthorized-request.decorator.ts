import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNAUTHORIZED_REQUEST = 'ALLOW_UNAUTHORIZED_REQUEST';

export const AllowUnauthorizedRequest = () => SetMetadata(ALLOW_UNAUTHORIZED_REQUEST, true);
