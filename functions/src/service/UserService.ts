import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {UpdatePortPassRequest} from "../models/UpdatePortPassRequest";
import {ApprovePortPassRequest} from "../models/ApprovePortPassRequest";
import {UserUpdateRequest} from "../models/UserUpdateRequest";

import {
  StoreJob as StoreJob,
} from "./FirestoreTypes";


const auth = admin.auth();
const https = functions.https;
const firestore = admin.firestore();

const usersCollection = "users";
const userRatingsCollection = "user_ratings";
// const userDocumentsCollection = "user_documents";

export const isUserExists = https.onCall(async (data: {email: string|undefined, phoneNumber: string|undefined}, context) => {
  if (data.email) {
    const query = await firestore.collection(usersCollection).where("email", "==", data.email).get();
    if (!query.empty) {
      return true;
    }
  }
  if (data.phoneNumber) {
    const query = await firestore.collection(usersCollection).where("phoneNumber", "==", data.phoneNumber).get();
    if (!query.empty) {
      return true;
    }
  }
  return false;
});

export const driverSignup = https.onCall(async (data: {displayName: string, email: string, phoneNumber: string, company?: string|undefined, photoURL?: string|undefined}, context) => {
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }
  const id = context.auth.uid;
  const user = await auth.getUser(id);
  if (user != null) {
    await firestore.collection(usersCollection).doc(id).set({
      displayName: data.displayName,
      photoUrl: data.photoURL,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: "driver",
    });
    await firestore.collection(userRatingsCollection).doc(id).set({
      rating: 2,
    });
  }
});


export const createNewUser = https.onCall(async (data: {name: string, email: string, phoneNumber: string, password: string, role: string, photoUrl: string|null|undefined}, context) => {
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }
  const id = context.auth.uid;
  const user = await auth.getUser(id);
  if (user != null) {
    const userDetails = await firestore.collection(usersCollection).doc(id).get();
    const role = userDetails.get("role");
    if (role == "admin") {
      console.log(`data: ${data}`);
      const newUser = await auth.createUser({
        displayName: data.name,
        email: data.email,
        emailVerified: false,
        phoneNumber: data.phoneNumber,
        password: data.password,
        photoURL: data.photoUrl,
      });
      await firestore.collection(usersCollection).doc(newUser.uid).set({
        displayName: newUser.displayName,
        photoUrl: newUser.photoURL,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: data.role,
      });
      if (data.role == "driver") {
        await firestore.collection(userRatingsCollection).doc(newUser.uid).set({
          rating: 2,
        });
      }
      return {uid: newUser.uid};
    }
  }
  return {};
});


export const updateUser = https.onCall(async (req: UserUpdateRequest, context) => {
  console.info(JSON.stringify(req));
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }
  const requestorId = context.auth.uid;
  const requestor = await auth.getUser(requestorId);
  if (requestor != null) {
    const requestorDetails = await firestore.collection(usersCollection).doc(requestorId).get();
    const requestorRole = requestorDetails.get("role");
    let userId = requestorId;
    if (req.id) {
      if (requestorRole == "admin") {
        userId = req.id ?? requestorId;
      } else {
        throw new https.HttpsError("permission-denied", "User not admin");
      }
    }
    const user = await auth.getUser(userId);
    const userDetails = await firestore.collection(usersCollection).doc(userId).get();
    console.info(`requestorId: ${requestorId}`);
    console.info(`userId: ${userId}`);
    console.info(`req.role: ${req.role}`);
    if (req.phoneNumber) {
      if (user.phoneNumber != req.phoneNumber) {
        const query = await firestore.collection(usersCollection).where("phoneNumber", "==", req.phoneNumber).get();
        if (!query.empty) {
          throw new https.HttpsError("already-exists", "User with phone number already exists");
        }
        await auth.updateUser(userId, {
          phoneNumber: req.phoneNumber,
        });
      }
      await firestore.collection(usersCollection).doc(userId).update({
        phoneNumber: req.phoneNumber,
      });
    }
    if (req.email) {
      if (user.email != req.email) {
        const query = await firestore.collection(usersCollection).where("email", "==", req.email).get();
        if (!query.empty) {
          throw new https.HttpsError("already-exists", "User with email already exists");
        }
        await auth.updateUser(userId, {
          email: req.email,
          emailVerified: false,
        });
      }
      await firestore.collection(usersCollection).doc(userId).update({
        email: req.email,
      });
    }
    if (req.password) {
      await auth.updateUser(userId, {
        password: req.password,
      });
    }
    if (req.displayName) {
      if (user.displayName != req.displayName) {
        await auth.updateUser(userId, {
          displayName: req.displayName,
        });
      }
      await firestore.collection(usersCollection).doc(userId).update({
        displayName: req.displayName,
      });
    }
    if (req.photoUrl) {
      // if (user.photoURL != req.photoUrl) {
      //   await auth.updateUser(userId, {
      //     photoURL: req.photoUrl,
      //   });
      // }
      await firestore.collection(usersCollection).doc(userId).update({
        photoUrl: req.photoUrl,
      });
    }
    if (req.company) {
      await firestore.collection(usersCollection).doc(userId).update({
        company: req.company,
      });
    }
    if (requestorRole == "admin") {
      console.info("is admin");
      if (req.role && userDetails.get("role") != req.role) {
        if (requestorId == userId) {
          throw new https.HttpsError("invalid-argument", "admin cannot change their own role");
        }
        await firestore.collection(usersCollection).doc(userId).update({
          role: req.role,
        });
      }
      if (req.portPassId || req.portPassExpiry || req.portPassFrontImageUrl || req.portPassBackImageUrl || req.portPassVerified) {
        console.info("updating port pass");
        if (req.portPassVerified) {
          if (req.portPassVerified < 0 || req.portPassVerified > 2) {
            throw new https.HttpsError("invalid-argument", "field portPassVerified must be of value 0, 1 or 2");
          }
          console.info("updating port pass verified field correct");
        }
        console.info("updating port pass create document");
        const portPassDoc = {
          id: req.portPassId,
          expiry: req.portPassExpiry,
          frontImageUrl: req.portPassFrontImageUrl,
          backImageUrl: req.portPassBackImageUrl,
          verified: req.portPassVerified,
        };

        // new implimentataion 2021-11-09
        // console.info(JSON.stringify(portPassDoc));
        // await firestore.collection(userDocumentsCollection).doc(userId).collection("documents").doc("portPass").set(portPassDoc);

        // new implimentataion 2021-11-09
        await firestore.collection(usersCollection).doc(userId).update({"userDocuments.portPass": portPassDoc});
      }
    }
  }
});

export const updatePortPass = https.onCall(async (req : UpdatePortPassRequest, context) => {
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }
  const id = context.auth.uid;
  // new implimentataion 2021-11-09
  // await firestore.collection(userDocumentsCollection).doc(id).collection("documents").doc("portPass").set({
  //   id: req.id,
  //   expiry: req.expiry,
  //   frontImageUrl: req.frontImageUrl,
  //   backImageUrl: req.backImageUrl,
  //   verified: 0,
  // });

  const portPassDoc = {
    id: req.id,
    expiry: req.expiry,
    frontImageUrl: req.frontImageUrl,
    backImageUrl: req.backImageUrl,
    verified: 0,
  };
  await firestore.collection(usersCollection).doc(id).update({"userDocuments.portPass": portPassDoc});
});

export const approvePortPass = https.onCall(async (req : ApprovePortPassRequest, context) => {
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }

  // new implimentataion 2021-11-09
  // await firestore.collection(userDocumentsCollection).doc(req.driverId).collection("documents").doc("portPass").update({
  //   verified: req.verified,
  // });
  await firestore.collection(usersCollection).doc(req.driverId).update({"userDocuments.portPass.verified": req.verified});
});

// Following functions developed by Jeewantha

export const reportTest = https.onCall(async (data: {
  from: string,
  to: string,
  shippingLines:string[],
  states: string[],
  grades:string[],
  sizes:string[]

}, context) => {
  if (context.auth == null || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "User not authenticated");
  }

  const lengthOfShippingLines = data.shippingLines.length;
  const lengthOfstates = data.states.length;
  const lengthOfGrades = data.grades.length;
  const lengthOfSizes = data.sizes.length;

  // any of shippingLine,ststes, grades, sizes with entry level
  // shippingLines with entry level
  // shippingLines, states with entry level
  // shippingLines, states, grades with entry level
  // shippingLines, states, grades, sizes with entry level


  const fromTimeStamp = admin.firestore.Timestamp.fromDate(new Date(data.from));
  const toTimeStamp = admin.firestore.Timestamp.fromDate(new Date(data.to));


  const jobs = await firestore.collection("jobs")
      .where("createdTime", ">", fromTimeStamp)
      .where("createdTime", "<", toTimeStamp)
      .get();

  const entryLevel = [] as StoreJob[];
  let finalOutput = [] as StoreJob[];

  let debugStatus = [] as any;
  const lengthsStatus = [] as any;

  lengthsStatus.push(["length-sl", lengthOfShippingLines]);
  lengthsStatus.push(["length-status", lengthOfstates]);
  lengthsStatus.push(["length-grades", lengthOfGrades]);
  lengthsStatus.push(["length-Sizes", lengthOfSizes]);

  await jobs.forEach(async (doc) => {
    const job = await doc.data() as StoreJob;
    entryLevel.push(job);
  });


  if (lengthOfShippingLines > 0 || lengthOfstates > 0 || lengthOfGrades > 0 || lengthOfSizes > 0) {
    debugStatus.push(" lengthOfShippingLines > 0 || lengthOfstates > 0 || lengthOfGrades > 0 || lengthOfSizes > 0 is True");
    finalOutput = entryLevel;

    debugStatus.push("final Output is equal to entryLevel");

    let outputOfLevelOne = [] as StoreJob[];
    let outputOfLevelTwo = [] as StoreJob[];
    let outputOfLevelThree = [] as StoreJob[];
    let outputOfLevelFour = [] as StoreJob[];


    if (lengthOfShippingLines > 0) {
      debugStatus.push("lengthOfShippingLines > 0 - True");
      outputOfLevelOne = entryLevel.filter((flOne: StoreJob)=>{
        if (data.shippingLines.includes(flOne.shippingLine as any) ) {
          return flOne;
        } else {
          return;
        }
      });
      debugStatus.push(["outputOfLevelOne is entryLevel.filter", outputOfLevelOne]);
    } else {
      debugStatus.push("lengthOfShippingLines > 0 - False");
      outputOfLevelOne = entryLevel;
      debugStatus.push("outputOfLevelOne  to entryLevel", outputOfLevelOne);
    }


    if (lengthOfstates > 0) {
      debugStatus.push("lengthOfstates > 0 - True");
      outputOfLevelTwo = outputOfLevelOne.filter((fl: StoreJob)=>{
        if (data.states.includes(fl.status) ) {
          return fl;
        } else {
          return;
        }
      });
      debugStatus.push("outputOfLevelTwo is outputOfLevelOne.filter", outputOfLevelTwo);
    } else {
      debugStatus.push("lengthOfstates > 0 - False");
      outputOfLevelTwo = outputOfLevelOne;
      debugStatus.push("outputOfLevelTwo is qequal  to outputOfLevelOne", outputOfLevelTwo);
    }

    if (lengthOfGrades > 0) {
      debugStatus.push("lengthOfGrades > 0 - True");
      outputOfLevelThree = outputOfLevelTwo.filter((fl: StoreJob)=>{
        if (data.grades.includes(fl.container?.grade as any) ) {
          return fl;
        } else {
          return;
        }
      });
      debugStatus.push("outputOfLevelThree is outputOfLevelTwo.filter", outputOfLevelThree);
    } else {
      debugStatus.push("lengthOfGrades > 0 - False");
      outputOfLevelThree = outputOfLevelTwo;
      debugStatus.push("outputOfLevelThree is qequal  to outputOfLevelTwo", outputOfLevelThree);
    }

    if (lengthOfSizes > 0) {
      debugStatus.push("lengthOfSizes > 0 - True");
      outputOfLevelFour = outputOfLevelThree.filter((fl: StoreJob)=>{
        if (data.sizes.includes(fl.container?.size as any) ) {
          return fl;
        } else {
          return;
        }
      });
      debugStatus.push("outputOfLevelFour is outputOfLevelThree.filter", outputOfLevelFour);
    } else {
      debugStatus.push("lengthOfSizes > 0 - False");
      outputOfLevelFour = outputOfLevelThree;
      debugStatus.push("outputOfLevelFour is qequal  to outputOfLevelTwo", outputOfLevelFour);
    }

    finalOutput = outputOfLevelFour;

    debugStatus.push("finalOutput = outputOfLevelFour", finalOutput);
  } else {
    debugStatus = "stageZeroIsFalse";
    finalOutput = entryLevel;
  }

  console.log(`data: ${data}`);
  return {result: finalOutput, debugStatus: debugStatus, lengths: lengthsStatus};

  // return {data: data, result: entryLevel};
});


