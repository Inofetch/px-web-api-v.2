import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import * as UserService from "./service/UserService";
export const user = UserService;
