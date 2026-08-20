<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Clearance;
use App\Models\Delivery;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentCenterController extends Controller
{
    public function index(): Response
    {
        $deliveryCounts = Attachment::where('attachable_type', Delivery::class)
            ->selectRaw('attachable_id, count(*) as count')
            ->groupBy('attachable_id')
            ->pluck('count', 'attachable_id');

        $poCounts = Attachment::where('attachable_type', ServePo::class)
            ->selectRaw('attachable_id, count(*) as count')
            ->groupBy('attachable_id')
            ->pluck('count', 'attachable_id');

        $letterCounts = Attachment::where('attachable_type', PoLetterMonitoring::class)
            ->selectRaw('attachable_id, count(*) as count')
            ->groupBy('attachable_id')
            ->pluck('count', 'attachable_id');

        $clearanceCounts = Attachment::where('attachable_type', Clearance::class)
            ->selectRaw('attachable_id, count(*) as count')
            ->groupBy('attachable_id')
            ->pluck('count', 'attachable_id');

        $deliveryPoMap = Delivery::pluck('po_number', 'delivery_id');
        $letterPoMap = PoLetterMonitoring::pluck('po_number', 'id');

        $totalsByPo = [];
        foreach ($poCounts as $poNumber => $count) {
            $totalsByPo[$poNumber] = ($totalsByPo[$poNumber] ?? 0) + $count;
        }
        foreach ($deliveryCounts as $deliveryId => $count) {
            $poNumber = $deliveryPoMap[$deliveryId] ?? null;
            if ($poNumber) {
                $totalsByPo[$poNumber] = ($totalsByPo[$poNumber] ?? 0) + $count;
            }
        }
        foreach ($letterCounts as $letterId => $count) {
            $poNumber = $letterPoMap[$letterId] ?? null;
            if ($poNumber) {
                $totalsByPo[$poNumber] = ($totalsByPo[$poNumber] ?? 0) + $count;
            }
        }

        $purchaseOrders = ServePo::orderBy('po_date', 'desc')
            ->get(['po_number', 'end_user', 'po_date'])
            ->map(fn ($po) => [
                'id' => $po->po_number,
                'label' => $po->po_number,
                'subtitle' => $po->end_user,
                'attachment_count' => $totalsByPo[$po->po_number] ?? 0,
            ]);

        $clearances = Clearance::with('office:office_code,office_name')
            ->orderBy('claim_date', 'desc')
            ->get()
            ->map(fn ($clearance) => [
                'id' => $clearance->clearance_id,
                'label' => $clearance->name,
                'subtitle' => $clearance->getRelation('office')?->office_name,
                'attachment_count' => $clearanceCounts[$clearance->clearance_id] ?? 0,
            ]);

        return Inertia::render('document-center/index', [
            'purchaseOrders' => $purchaseOrders,
            'clearances' => $clearances,
        ]);
    }

    public function poAttachments(string $po_number)
    {
        $po = ServePo::where('po_number', $po_number)->firstOrFail();

        $deliveryIds = Delivery::where('po_number', $po_number)->pluck('delivery_id');
        $letterIds = PoLetterMonitoring::where('po_number', $po_number)->pluck('id');

        $attachments = Attachment::query()
            ->where(function ($query) use ($po_number, $deliveryIds, $letterIds) {
                $query->where(fn ($q) => $q->where('attachable_type', ServePo::class)->where('attachable_id', $po_number))
                    ->orWhere(fn ($q) => $q->where('attachable_type', Delivery::class)->whereIn('attachable_id', $deliveryIds))
                    ->orWhere(fn ($q) => $q->where('attachable_type', PoLetterMonitoring::class)->whereIn('attachable_id', $letterIds));
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Attachment $a) => $this->formatAttachment($a, match ($a->attachable_type) {
                ServePo::class => 'Purchase Order',
                Delivery::class => 'Delivery',
                PoLetterMonitoring::class => 'PO Letter',
                default => 'Other',
            }));

        return response()->json([
            'label' => $po->po_number,
            'subtitle' => $po->end_user,
            'stats' => $this->buildStats($attachments, [
                'from_deliveries' => 'Delivery',
                'from_po_letters' => 'PO Letter',
                'from_po' => 'Purchase Order',
            ]),
            'attachments' => $attachments->values(),
        ]);
    }

    public function clearanceAttachments(int $id)
    {
        $clearance = Clearance::with('office:office_code,office_name')->findOrFail($id);

        $attachments = Attachment::where('attachable_type', Clearance::class)
            ->where('attachable_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Attachment $a) => $this->formatAttachment($a, 'Clearance'));

        return response()->json([
            'label' => $clearance->name,
            'subtitle' => $clearance->getRelation('office')?->office_name,
            'stats' => $this->buildStats($attachments, ['from_clearance' => 'Clearance']),
            'attachments' => $attachments->values(),
        ]);
    }

    private function formatAttachment(Attachment $attachment, string $source): array
    {
        return [
            'id' => $attachment->id,
            'name' => $attachment->original_name,
            'url' => $attachment->url,
            'mime_type' => $attachment->mime_type,
            'file_size' => $attachment->file_size,
            'source' => $source,
            'is_image' => str_starts_with((string) $attachment->mime_type, 'image/'),
            'is_pdf' => $attachment->mime_type === 'application/pdf',
            'created_at' => optional($attachment->created_at)->format('Y-m-d H:i'),
        ];
    }

    private function buildStats($attachments, array $sourceKeyMap): array
    {
        $stats = [
            'total' => $attachments->count(),
            'images' => $attachments->where('is_image', true)->count(),
            'pdfs' => $attachments->where('is_pdf', true)->count(),
        ];

        foreach ($sourceKeyMap as $statKey => $sourceLabel) {
            $stats[$statKey] = $attachments->where('source', $sourceLabel)->count();
        }

        return $stats;
    }
}