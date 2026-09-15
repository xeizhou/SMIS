<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serve_po', function (Blueprint $table) {
            $table->string('po_number', 50)->primary();
            $table->text('item_description')->nullable();
            $table->date('po_date')->nullable();
            $table->date('po_received_date')->nullable();
            $table->string('po_vpad_forwarded_by', 255)->nullable();
            $table->string('inclusive_date', 100)->nullable();
            $table->string('delivery_term', 100)->nullable();
            $table->string('pr_number', 50)->nullable();
            $table->date('pr_date')->nullable();
            $table->string('philgeps_reference_no', 50)->nullable();
            $table->string('procurement_type', 20)->nullable();
            $table->string('mode_of_procurement', 100)->nullable();
            $table->decimal('total_amount_abc', 15, 2)->default(0);
            $table->decimal('total_amount_po', 15, 2)->default(0);
            $table->decimal('total_amount_diff', 15, 2)->default(0);

            $table->string('fund_cluster_id', 20)->nullable();

            $table->string('ors_burs_no', 50)->nullable();
            $table->date('ors_burs_date')->nullable();
            $table->string('responsibility_center', 100)->nullable();
            $table->string('uacs_object_code', 50)->nullable();

            $table->foreignId('supplier_id')->nullable()
                ->constrained('supplier_list', 'supplier_id')
                ->nullOnDelete();

            $table->string('end_user', 150)->nullable();
            $table->date('date_forwarded_to_smu')->nullable();
            $table->date('coa_processed_date')->nullable();
            $table->date('date_forwarded_frontdesk')->nullable();

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

            $table->timestamps();

            $table->foreign('fund_cluster_id', 'fk_serve_po_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serve_po');
    }
};
