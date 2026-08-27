export interface RegSPIRecord {
    regspi_id: number;
    month_year: string;
    ics_no: string | null;
    rrsp_no: string | null;
    fund_cluster_id: string | null;
    semi_expendable_property_no: string;
    item_description: string;
    estimated_useful_life: number | string | null;
    issued_qty: number | string | null;
    issued_office_officer: string | null;
    returned_qty: number | string | null;
    returned_office_officer: string | null;
    reissued_qty: number | string | null;
    reissued_office_officer: string | null;
    disposed_qty: number | string | null;
    balance_qty: number | string | null;
    amount: number | string | null;
    remarks: string | null;
    rrspMonitoring?: {
        rrsp_no?: string | null;
        item_description?: string | null;
    } | null;
}

export interface PaginatedRegSPIRecords {
    data: RegSPIRecord[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface RrspItem {
    id: number;
    item_description: string;
    property_no: string | null;
    cost: number | null;
}

export interface RrspOption {
    id: number;
    rrsp_no: string;
    items?: RrspItem[];
}

export interface Filters {
    search: string | null;
    rrsp_no: string | null;
    fund_cluster_id: string | null;
}

export interface FundClusterOption {
    fund_cluster_id: string;
    fund_description: string;
}
