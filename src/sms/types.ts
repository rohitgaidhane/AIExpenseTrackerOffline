export type AndroidSmsRecord = {
  _id: string;
  thread_id?: string;
  address: string;
  body: string;
  /** Milliseconds since epoch as string (Android content resolver). */
  date: string;
  read?: string;
  type?: string;
};
