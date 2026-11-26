'use client';
import {createAuthClient} from '@neon/auth/next';
let instance:ReturnType<typeof createAuthClient>|undefined;
export function browserAuth(){return instance??=createAuthClient()}
