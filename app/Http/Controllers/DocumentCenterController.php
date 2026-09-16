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

        $archives = \App\Models\Archive::with('user:id,name,avatar_path')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($archive) => [
                'id' => $archive->id,
                'identity_document' => $archive->identity_document,
                'archived_from' => $archive->archived_from,
                'archived_by' => $archive->user ? $archive->user->name : 'Unknown',
                'archived_by_avatar' => $archive->user ? $archive->user->avatar_url : null,
                'created_at' => $archive->created_at->diffForHumans(),
            ]);

        return Inertia::render('document-center/index', [
            'purchaseOrders' => $purchaseOrders,
            'clearances' => $clearances,
            'archives' => $archives,
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

    public function archiveOriginalDetails(int $id)
    {
        $archive = \App\Models\Archive::findOrFail($id);

        $type = $archive->archivable_type;
        $id = $archive->archivable_id;

        $model = match($type) {
            \App\Models\ServePo::class => \App\Models\ServePo::withTrashed()->with(['supplier', 'fundCluster', 'office', 'attachments', 'items', 'inspectionEntries'])->where('po_number', $id)->first(),
            \App\Models\Delivery::class => \App\Models\Delivery::withTrashed()->with(['attachments', 'deliveryDates', 'supplier'])->where('delivery_id', $id)->first(),
            \App\Models\PoLetterMonitoring::class => \App\Models\PoLetterMonitoring::withTrashed()->with(['attachments'])->find($id),
            \App\Models\RrspMonitoring::class => \App\Models\RrspMonitoring::withTrashed()->with(['items', 'attachments'])->find($id),
            \App\Models\RegspiMonitoring::class => \App\Models\RegspiMonitoring::withTrashed()->with(['attachments'])->find($id),
            \App\Models\BonaVidaMonitoring::class => \App\Models\BonaVidaMonitoring::withTrashed()->with(['attachments'])->find($id),
            \App\Models\Clearance::class => \App\Models\Clearance::withTrashed()->with(['attachments'])->find($id),
            \App\Models\EmployeeFileLocator::class => \App\Models\EmployeeFileLocator::withTrashed()->with(['attachments'])->find($id),
            \App\Models\Office::class => \App\Models\Office::withTrashed()->find($id),
            \App\Models\StockItem::class => \App\Models\StockItem::withTrashed()->with(['units', 'fundCluster'])->find($id),
            \App\Models\Unit::class => \App\Models\Unit::withTrashed()->find($id),
            \App\Models\Transaction::class => tap(
                \App\Models\Transaction::withTrashed()->with(['unit', 'fundCluster', 'office', 'stockItem'])->find($id),
                fn ($t) => $t?->setAttribute('fund_cluster_detail', $t->fundCluster)
            ),
            default => null,
        };

        if ($model && $type === \App\Models\ServePo::class) {
            $model->setAttribute('inspection_entries', $model->inspectionEntries);
        }

        if ($model) {
            return response()->json([
                'type' => class_basename($type),
                'data' => $model
            ]);
        }

        // Return a structured error for other types that are not implemented yet
        return response()->json([
            'message' => 'Details view not yet implemented for ' . class_basename($type)
        ], 501);
    }

    public function archiveAttachments(int $id)
    {
        $archive = \App\Models\Archive::findOrFail($id);

        $attachments = Attachment::where('attachable_type', $archive->archivable_type)
            ->where('attachable_id', $archive->archivable_id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Attachment $a) => $this->formatAttachment($a, $archive->archived_from));

        return response()->json([
            'label' => $archive->identity_document,
            'subtitle' => $archive->archived_from,
            'stats' => $this->buildStats($attachments, ['total' => $archive->archived_from]), // using total just as a placeholder since stats logic handles total internally
            'attachments' => $attachments->values(),
        ]);
    }

    public function restoreArchive(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:archives,id',
        ]);

        $archives = \App\Models\Archive::whereIn('id', $request->ids)->get();

        foreach ($archives as $archive) {
            $type = $archive->archivable_type;
            $id = $archive->archivable_id;

            $model = match($type) {
                \App\Models\ServePo::class => \App\Models\ServePo::withTrashed()->where('po_number', $id)->first(),
                \App\Models\Delivery::class => \App\Models\Delivery::withTrashed()->where('delivery_id', $id)->first(),
                \App\Models\PoLetterMonitoring::class => \App\Models\PoLetterMonitoring::withTrashed()->find($id),
                \App\Models\RrspMonitoring::class => \App\Models\RrspMonitoring::withTrashed()->find($id),
                \App\Models\RegspiMonitoring::class => \App\Models\RegspiMonitoring::withTrashed()->find($id),
                \App\Models\BonaVidaMonitoring::class => \App\Models\BonaVidaMonitoring::withTrashed()->find($id),
                \App\Models\Clearance::class => \App\Models\Clearance::withTrashed()->find($id),
                \App\Models\EmployeeFileLocator::class => \App\Models\EmployeeFileLocator::withTrashed()->find($id),
                \App\Models\Office::class => \App\Models\Office::withTrashed()->find($id),
                \App\Models\StockItem::class => \App\Models\StockItem::withTrashed()->find($id),
                \App\Models\Unit::class => \App\Models\Unit::withTrashed()->find($id),
                \App\Models\TransactionLog::class => \App\Models\TransactionLog::withTrashed()->find($id),
                \App\Models\User::class => \App\Models\User::withTrashed()->find($id),
                \App\Models\Transaction::class => \App\Models\Transaction::withTrashed()->find($id),
                default => null,
            };

            if ($model && method_exists($model, 'restore')) {
                $model->restore();
            }

            $archive->delete();
        }

        return redirect()->back()->with('success', 'Selected documents restored successfully.');
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