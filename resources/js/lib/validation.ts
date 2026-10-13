export const PATTERNS = {
    rrppeNo: /^[0-9\-]+$/,
    rrspNo: /^[0-9\-]+$/,
    propertyNo: /^[0-9\-]+$/,
    wmrNo: /^[0-9\-]+$/,
    iarNo: /^[0-9\-]+$/,
    monthYear: /^[0-9\-]+$/,
    nameOrOffice: /^[a-zA-Z\s.'\-]+$/,
    nameWithAmpersand: /^[a-zA-Z\s.'\-&]+$/,
    icsNo: /^[0-9]+$/,
    invoiceNo: /^[0-9]+$/,
    itemVehicle: /^[a-zA-Z0-9\s.\-]+$/,
    jobOrder: /^[a-zA-Z0-9\-]+$/,
    typeBrandModel: /^[a-zA-Z0-9\s\-]+$/,
    invoiceNumberComma: /^[0-9\-,]+$/,
    jobOrderNo: /^[a-zA-Z0-9\-]+$/,
    vehicleType: /^[a-zA-Z0-9\s.\-]+$/,
    basicText: /^[a-zA-Z0-9\s.,'&\-]+$/,
    plateNumber: /^[a-zA-Z0-9\s\-]+$/,
    serialEngineNo: /^[a-zA-Z0-9\s.\-]+$/,
    dateOrYear: /^[0-9a-zA-Z\s./\-]+$/,
    semiExpendablePropertyNo: /^[a-zA-Z0-9\-]+$/,
    poNo: /^[0-9\-]+$/,
    inclusiveDate: /^[a-zA-Z0-9\s.,\-]+$/,
    prNo: /^[0-9\-]+$/,
    philgepsRefNo: /^[0-9]+$/,
    orsBursNo: /^[0-9\-]+$/,
    uacsObjectCode: /^[0-9]+$/,
    contactInfo: /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+?[0-9\s\-()]{7,20})$/,
    iarNumber: /^[0-9]+$/,
    invoiceDocumentRef: /^[a-zA-Z0-9\s;\/:#.\-&]+$/,
    deliveryReceiptRef: /^[a-zA-Z0-9\s\/;\-]+$/,
    parIcsMultiRef: /^[0-9\s\/;\-]+$/,
    risMultiRef: /^[0-9\s\/;\-]+$/,
    documentLink: /^https?:\/\/[a-zA-Z0-9]+([.\-][a-zA-Z0-9]+)*(?::[0-9]+)?(?:[\/?#][^\s<>"{}|\\^`]*)?$/,
    address: /^[a-zA-Z0-9\s.,'#\/\-()&]+$/,
    contactNumber: /^\+?[0-9\s\-()]{7,20}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    numbersOnly: /^[0-9]+$/,
    fundDescription: /^[a-zA-Z0-9\s.\-]+$/,
};

export const MESSAGES = {
    numbersAndHyphens: "Only numbers and hyphens are allowed.",
    names: "Only letters, spaces, periods, apostrophes, and hyphens are allowed.",
    namesWithAmpersand: "Only letters, spaces, periods, apostrophes, hyphens, and ampersands are allowed.",
    numbersOnly: "Only numbers are allowed.",
    itemVehicle: "Only letters, numbers, spaces, periods, and hyphens are allowed.",
    jobOrder: "Only letters, numbers, and hyphens are allowed.",
    typeBrandModel: "Only letters, numbers, spaces, and hyphens are allowed.",
    invoiceNumberComma: "Only numbers, hyphens, and commas are allowed.",
    monthYear: "Only numbers and hyphens are allowed (e.g. 2025-01).",
    iarNo: "Only letters, numbers, and hyphens are allowed.",
    invoiceNo: "Only numbers, hyphens, and commas are allowed.",
    jobOrderNo: "Only letters, numbers, and hyphens are allowed.",
    basicText: "Invalid characters detected.",
    plateNumber: "Only letters, numbers, spaces, and hyphens are allowed.",
    serialEngineNo: "Only letters, numbers, spaces, periods, and hyphens are allowed.",
    dateOrYear: "Only letters, numbers, spaces, slashes, periods, and hyphens are allowed.",
    semiExpendablePropertyNo: "Only letters, numbers, and hyphens are allowed.",
    inclusiveDate: "Only letters, numbers, spaces, commas, periods, and hyphens are allowed.",
    contactInfo: "Please enter a valid email address or phone number.",
    invoiceDocumentRef: "Only letters, numbers, spaces, hyphens, periods, colons, slashes, semicolons, ampersands, and # are allowed.",
    deliveryReceiptRef: "Only letters, numbers, hyphens, slashes, semicolons, and spaces are allowed.",
    parIcsMultiRef: "Only numbers, slashes, semicolons, hyphens, and spaces are allowed.",
    risMultiRef: "Only numbers, slashes, semicolons, hyphens, and spaces are allowed.",
    documentLink: "Please enter a valid URL (e.g. https://example.com).",
    address: "Only letters, numbers, spaces, commas, periods, hyphens, slashes, and # are allowed.",
    contactNumber: "Please enter a valid phone number.",
    email: "Please enter a valid email address.",
    fundDescription: "Only letters, numbers, spaces, hyphens, and periods are allowed.",
};

export function validateInput(
    value: string,
    pattern: RegExp,
    errorMessage: string,
    field: string,
    setError: (field: string, message: string) => void,
    clearErrors: (field: string) => void
) {
    if (value && !pattern.test(value)) {
        setError(field, errorMessage);
    } else {
        clearErrors(field);
    }
}

/**
 * Formats standard reference numbers (e.g. PO, RRSP, RRPPE) into YYYY-MM-XXXX
 * by auto-inserting hyphens after the 4-digit and 2-digit segments.
 */
export function formatReferenceNumberInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    const part1 = digits.slice(0, 4);
    const part2 = digits.slice(4, 6);
    const part3 = digits.slice(6, 16);

    let out = part1;
    if (part2) out += '-' + part2;
    if (part3) out += '-' + part3;
    return out;
}

export const formatPoNumberInput = formatReferenceNumberInput;