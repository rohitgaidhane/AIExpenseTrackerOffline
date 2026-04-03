import { PermissionsAndroid } from "react-native";

export async function ensureReadSmsPermission(): Promise<boolean> {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: "Read SMS (on device only)",
      message:
        "This app parses bank SMS locally to build your expense list. No messages are uploaded.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
