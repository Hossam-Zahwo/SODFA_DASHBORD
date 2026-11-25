import {auth} from '@/lib/auth/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const {GET,POST,PUT,PATCH,DELETE}=auth.handler();
