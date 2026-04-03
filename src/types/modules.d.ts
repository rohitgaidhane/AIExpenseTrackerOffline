declare module "react-native-get-sms-android" {
  export interface SmsFilter {
    box?: string;
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    read?: 0 | 1;
    _id?: number;
    thread_id?: number;
    address?: string;
    body?: string;
    indexFrom?: number;
    maxCount?: number;
  }

  export interface SmsAndroidModule {
    list(
      filterJson: string,
      fail: (err: string) => void,
      success: (count: number, smsList: string) => void,
    ): void;
  }

  const SmsAndroid: SmsAndroidModule;
  export default SmsAndroid;
}
