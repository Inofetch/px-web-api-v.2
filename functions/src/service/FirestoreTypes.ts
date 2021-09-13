// DTO


export interface MappedColumn {
    container: number;
    shippingLine: number;
    ero: number;
    typeISO: number;
    expireAt:number;

}

export interface ArchISO {
    archISO: string;
    description: string;
    height: number;
    length: number;
    width: number;
    size: number;
    imageUrl: string;
}

export interface StoreUserDocs {

    backImageUrl: string;
    frontImageUrl: string;
    expiry: string;
    id: string;
    verified: -1 | 0 | 1;
}

// Firebase doc types
export interface StoreJob {
    firebaseId?:string;
    shippingLine?: string; // shipping line's code
    container?: StoreContainer;
    createdTime?: any;
    updatedTime?:any;
    createdBy?:any;
    licensePlate?: string;
    assignId?: string;
    assign?: StoreUser;

    ero?:any;

    front?: StoreLocation | null;
    back?: StoreLocation | null;
    left?: StoreLocation | null;
    right?: StoreLocation | null;
    exteriorVideo?: string | null;
    interiorVideoLR?: string | null;
    interiorVideoBT?: string | null;

    timeline?: StoreJobTimeline[];

    driverId?: string;
    driver?: StoreUser;

    comments?: StoreComment[];
    approvalMessage?:string;
    appointmentRequired?:boolean;


    // driverLocation?: string; //lat long for the map
    // inspectionTimeline: [];
    // license;

    status:
        | "TODO"
        | "In progress"
        | "Pending Review"
        | "In review"
        | "Approved"
        | "Failed"
        | "In Transit"
        | "Done"
        | "Rejected"
        | "To-Depot"
        | "L1 Pass"
        | "L1 Fail"
        | "L2 Pass"
        | "L2 Fail";

    expireAt?:[];

}

export interface StoreJobTimeline {
    date?:any;
    description: string;
    userId: string;
    user?: StoreUser;
}

export interface StoreComment {
    userId: string;
    user?: StoreUser;
    message?: string;
    attachments?: string[];
    date?:any;
}

export interface StoreLocation {
    images: string[];
    damages: string[];
    note: string;
    severityOfDamage: "Major" | "Minor" | null;
    damageLocations: string[];
    damageTypes: string[] | null;
    hasDamages: boolean;
    damageTypeOther:string | null;
}

export interface StoreContainer {
    firebaseId?: string;
    assign?: StoreUser;
    companyName?: string;

    length?: number;
    height?: number;
    size?: number|null;
    width?: number;

    number?: string;
    typeISO?: string;
    archISO?: string;
    description?: string;
    imageUrl?: string;
    grade?:string;
}

export interface StoreUser {
    firebaseId?:any;
    // primaryContactNumber;
    // emergencyContact: {
    //     name: string;
    //     contactNumber;
    //     relationship;
    // };
    // state;
    // country;
    // employeeNumber;
    displayName:any;
    email:any;
    phoneNumber:any;
    photoUrl:any;
    role?:any;
    // address;
    // secondaryContactNumber;
}

export interface StoreShippingLine {
    firebaseId?:any;
    code?:any;
    name?:any;
    handlingAgentId?: string;
    handlingAgent?: StoreUser;
    active?: boolean;
}

export interface transformedTable {
    containerNumber?:any;
    shippingLine?:any;
    typeISO?:any;
    size?: string;
    driver?: StoreUser;
    assignedTo?: boolean;
    status?: boolean;
}
