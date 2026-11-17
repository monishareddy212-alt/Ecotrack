import 'express-session';

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SafeUser;
    }
  }
}
