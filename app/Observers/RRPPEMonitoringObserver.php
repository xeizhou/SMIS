<?php

namespace App\Observers;

use App\Models\ForDisposalMonitoring;
use App\Models\RRPPEMonitoring;

class RRPPEMonitoringObserver
{
    public function saved(RRPPEMonitoring $record): void
    {
        $status = strtoupper(trim((string) $record->status));

        if ($status !== 'UNSERVICEABLE') {
            return;
        }

        ForDisposalMonitoring::updateOrCreate(
            [
                'source_type' => 'rrppe_monitoring',
                'source_id' => $record->id,
            ],
            [
                'transaction_no' => 'RRPPE-' . $record->rrppe_no . '-' . $record->id,
                'pre_repair_no' => $record->rrppe_no,
                'from_accountable_officer' => $record->end_user_name ?? 'N/A',
                'to_accountable_officer' => 'For Disposal',
                'property_no' => $record->property_no ?? 'N/A',
                'description' => $record->item_description ?? 'N/A',
                'amount' => $record->cost ?? 0,
                'condition_of_ppe' => 'UNSERVICEABLE',
                'remarks' => $record->remarks,
                'location' => $record->area ?? 'N/A',
            ]
        );
    }

    public function deleted(RRPPEMonitoring $record): void
    {
        ForDisposalMonitoring::where('source_type', 'rrppe_monitoring')
            ->where('source_id', $record->id)
            ->delete();
    }
}