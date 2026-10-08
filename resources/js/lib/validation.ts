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
