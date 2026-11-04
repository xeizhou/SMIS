<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class NoticeOfDeliveryReportController extends Controller
{
    /**
     * Display the Notice of Delivery Report page.
     */
    public function index(Request $request): Response
    {
        $todayInput = $request->string('today_date')->toString() ?: now()->format('Y-m-d');
        $yesterdayInput = $request->string('yesterday_date')->toString() ?: now()->subDay()->format('Y-m-d');

        $todayDate = Carbon::parse($todayInput)->startOfDay();
        $yesterdayDate = Carbon::parse($yesterdayInput)->startOfDay();

        $getDeliveriesForDate = function (Carbon $date) {
            return Delivery::query()
                ->with(['supplier:supplier_id,supplier_name', 'servePo:po_number,end_user,total_amount_po,item_description,due_date'])
                ->whereDate('delivery_date', $date->format('Y-m-d'))    
                ->whereIn('status', ['COMPLETE', 'PARTIAL'])
                ->orderBy('po_number', 'asc')
                ->get()
                ->map(function ($delivery) {
                    return [
                        'delivery_id' => $delivery->delivery_id,
                        'po_number' => $delivery->po_number, 
                        'supplier_name' => $delivery->supplier?->supplier_name ?? 'N/A',
                        'status' => $delivery->status ?? 'COMPLETE',
                        'delivery_date' => $delivery->delivery_date?->format('Y-m-d') ?? 'N/A',
                        'end_user' => $delivery->end_user ?? $delivery->servePo?->end_user ?? 'N/A',
                        'total_amount_delivered' => (float) ($delivery->total_amount_delivered ?? 0),
                        'po_total_amount' => (float) ($delivery->po_total_amount ?? $delivery->servePo?->total_amount_po ?? 0),
                        'remarks' => $delivery->remarks,
                        'item_description' => $delivery->servePo?->item_description ?? '',
                    ];
                })
                ->values();
        };

        $todayDeliveries = null;
        $getTodayDeliveries = function () use (&$todayDeliveries, $getDeliveriesForDate, $todayDate) {
            if ($todayDeliveries === null) {
                $todayDeliveries = $getDeliveriesForDate($todayDate);
            }
            return $todayDeliveries;
        };

        $yesterdayDeliveries = null;
        $getYesterdayDeliveries = function () use (&$yesterdayDeliveries, $getDeliveriesForDate, $yesterdayDate) {
            if ($yesterdayDeliveries === null) {
                $yesterdayDeliveries = $getDeliveriesForDate($yesterdayDate);
            }
            return $yesterdayDeliveries;
        };

        $getStats = function ($deliveries) {
            return [
                'total_count' => $deliveries->count(),
                'complete_count' => $deliveries->where('status', 'COMPLETE')->count(),
                'partial_count' => $deliveries->where('status', 'PARTIAL')->count(),
                'total_delivered_amount' => (float) $deliveries->sum('total_amount_delivered'),
            ];
        };

        return Inertia::render('notice-of-delivery/index', [
            'todayDate' => $todayDate->format('Y-m-d'),
            'todayDateFormatted' => $todayDate->format('M j, Y'),
            'yesterdayDate' => $yesterdayDate->format('Y-m-d'),
            'yesterdayDateFormatted' => $yesterdayDate->format('M j, Y'),
            'isCustomToday' => $request->filled('today_date') && $request->input('today_date') !== now()->format('Y-m-d'),
            'isCustomYesterday' => $request->filled('yesterday_date') && $request->input('yesterday_date') !== now()->subDay()->format('Y-m-d'),
            'todayDeliveries' => fn () => $getTodayDeliveries(),
            'yesterdayDeliveries' => fn () => $getYesterdayDeliveries(),
            'todayStats' => fn () => $getStats($getTodayDeliveries()),
            'yesterdayStats' => fn () => $getStats($getYesterdayDeliveries()),
        ]);
    }
}
