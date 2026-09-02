<?php

namespace App\Observers;

use App\Models\ForDisposalMonitoring;
use App\Models\RrspItem;

class RrspItemObserver
{
    /**
     * Fires on both create and update. When an item's status is (or becomes)
     * UNSERVICEABLE, mirror it into For Disposal Monitoring. Keyed on
     * (source_type, source_id) via updateOrCreate so re-saving the same item
     * never produces duplicate disposal rows — it just refreshes the copy.
     */
    public function saved(RrspItem $item): void
    {
        $status = strtoupper(trim((string) $item->status));

        if ($status !== 'UNSERVICEABLE') {
            return;
        }


        $rrsp = $item->rrspMonitoring ?? $item->rrsp ?? null;

        // Fall back to a direct query if the relation isn't named as expected —
        // adjust the relation name below to match your actual RrspItem model
        // if this differs (I inferred it from the RrspMonitoring::items() relation).
        if (! $rrsp) {
            $rrsp = \App\Models\RrspMonitoring::find($item->rrsp_monitoring_id);
        }

        ForDisposalMonitoring::updateOrCreate(
            [
                'source_type' => 'rrsp_item',
                'source_id' => $item->id,
            ],
            [
                'transaction_no' => 'RRSP-' . ($rrsp->rrsp_no ?? $item->rrsp_monitoring_id) . '-' . $item->id,
                'pre_repair_no' => $rrsp->rrsp_no ?? null,
                'from_accountable_officer' => $rrsp->end_user_name ?? 'N/A',
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

    /**
     * If the item is deleted outright, remove its mirrored disposal row too.
     */
    public function deleted(RrspItem $item): void
    {
        ForDisposalMonitoring::where('source_type', 'rrsp_item')
            ->where('source_id', $item->id)
            ->delete();
    }
}