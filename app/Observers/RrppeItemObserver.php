<?php

namespace App\Observers;

use App\Models\ForDisposalMonitoring;
use App\Models\RrppeItem;
use App\Models\RRPPEMonitoring;

class RrppeItemObserver
{
    public function saved(RrppeItem $item): void
    {
        $status = strtoupper(trim((string) $item->status));

        if ($status !== 'UNSERVICEABLE') {
            ForDisposalMonitoring::where('source_type', 'rrppe_item')
                ->where('source_id', $item->id)
                ->delete();
            return;
        }

        $rrppe = $item->rrppe ?? RRPPEMonitoring::find($item->rrppe_monitoring_id);

        ForDisposalMonitoring::updateOrCreate(
            [
                'source_type' => 'rrppe_item',
                'source_id' => $item->id,
            ],
            [
                'transaction_no' => ($rrppe->rrppe_no ?? $item->rrppe_monitoring_id) . '-' . $item->id,
                'pre_repair_no' => $rrppe->rrppe_no ?? null,
                'from_accountable_officer' => $rrppe->end_user_name ?? 'N/A',
                'to_accountable_officer' => 'For Disposal',
                'property_no' => $item->property_no ?? 'N/A',
                'description' => $item->item_description ?? 'N/A',
                'amount' => $item->cost ?? 0,
                'condition_of_ppe' => 'UNSERVICEABLE',
                'remarks' => $item->remarks,
                'location' => $item->area ?? 'N/A',
            ]
        );
    }

    public function deleted(RrppeItem $item): void
    {
        ForDisposalMonitoring::where('source_type', 'rrppe_item')
            ->where('source_id', $item->id)
            ->delete();
    }
}
