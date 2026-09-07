<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            // Workflow state
            $table->string('po_step')->nullable();
            
            // End User tab
            $table->date('date_forwarded_to_end_user')->nullable();
            $table->string('end_user_forwarded_by')->nullable();
            
            // Supplier's Signature tab
            $table->date('date_forwarded_supplier')->nullable();
            $table->string('forwarded_by_supplier')->nullable();
            $table->string('claimed_by_supplier')->nullable();
            $table->date('supplier_signature_date')->nullable();
            
            // COA Stamp tab
            $table->date('date_forwarded_coa')->nullable();
            $table->string('forwarded_by_coa')->nullable();
            $table->date('date_returned_from_coa')->nullable();
            $table->date('coa_date')->nullable();
            $table->date('claim_date')->nullable();
            $table->string('claimed_by_coa')->nullable();
            
            // For Release tab
            $table->date('date_received_by_supplier')->nullable();
            $table->date('receipt_receiving_date')->nullable();
            $table->string('receipt_claimed_by')->nullable();
            $table->date('items_receiving_date')->nullable();
            $table->string('items_claimed_by')->nullable();
            
            // Payment Processing tab
            $table->string('payment_status')->nullable();
            $table->text('workflow_remarks')->nullable();
            $table->string('invoice_number')->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('delivery_receipt')->nullable();
            $table->string('par_ics_number')->nullable();
            $table->string('ris_number')->nullable();
            $table->string('inspected_by')->nullable();
            $table->date('inspection_date')->nullable();
            $table->string('iar_number')->nullable();
            $table->date('date_completed')->nullable();
            
            // Forwarded to Finance tab
            $table->date('date_forwarded_to_finance')->nullable();
            $table->string('finance_forwarded_by')->nullable();
            
            // Notifications tracking (legacy from PIR)
            $table->date('po_vpad_notified_date')->nullable();
            $table->string('po_vpad_notified_via')->nullable();
            $table->date('coa_stamp_notified_date')->nullable();
            $table->string('coa_stamp_notified_via')->nullable();
            $table->date('receipt_claimed_notified_date')->nullable();
            $table->string('receipt_claimed_notified_via')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            $table->dropColumn([
                'po_step',
                'date_forwarded_to_end_user',
                'end_user_forwarded_by',
                'date_forwarded_supplier',
                'forwarded_by_supplier',
                'claimed_by_supplier',
                'supplier_signature_date',
                'date_forwarded_coa',
                'forwarded_by_coa',
                'date_returned_from_coa',
                'coa_date',
                'claim_date',
                'claimed_by_coa',
                'date_received_by_supplier',
                'receipt_receiving_date',
                'receipt_claimed_by',
                'items_receiving_date',
                'items_claimed_by',
                'payment_status',
                'workflow_remarks',
                'invoice_number',
                'invoice_date',
                'delivery_receipt',
                'par_ics_number',
                'ris_number',
                'inspected_by',
                'inspection_date',
                'iar_number',
                'date_completed',
                'date_forwarded_to_finance',
                'finance_forwarded_by',
                'po_vpad_notified_date',
                'po_vpad_notified_via',
                'coa_stamp_notified_date',
                'coa_stamp_notified_via',
                'receipt_claimed_notified_date',
                'receipt_claimed_notified_via'
            ]);
        });
    }
};
