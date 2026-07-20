<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pir_monitoring', function (Blueprint $table) {
            $table->id('pir_id');

            $table->foreignId('supplier_id')
                ->constrained('supplier_list', 'supplier_id')
                ->restrictOnDelete();

            $table->string('po_number', 50);
            $table->string('unit_office', 100);
            $table->date('po_date')->nullable();
            $table->integer('delivery_term')->nullable();

            $table->string('fund_cluster', 20)->nullable();

            $table->string('pr_number', 50)->nullable();
            $table->date('pr_date')->nullable();
            $table->string('ors_bur_number', 50)->nullable();
            $table->date('ors_bur_date')->nullable();
            $table->decimal('po_amount', 15, 2)->nullable();
            $table->date('date_forwarded_supplier')->nullable();
            $table->string('forwarded_by_supplier', 100)->nullable();
            $table->string('claimed_by_supplier', 100)->nullable();
            $table->date('supplier_signature_date')->nullable();
            $table->date('date_forwarded_coa')->nullable();
            $table->string('forwarded_by_coa', 100)->nullable();
            $table->date('date_returned_from_coa')->nullable();
            $table->date('coa_date')->nullable();
            $table->date('claim_date')->nullable();
            $table->string('claimed_by_coa', 100)->nullable();
            $table->date('date_received_by_supplier')->nullable();
            $table->string('invoice_number', 100)->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('delivery_receipt', 100)->nullable();
            $table->date('date_completed')->nullable();
            $table->string('par_ics_number', 50)->nullable();
            $table->string('ris_number', 50)->nullable();
            $table->string('inspected_by', 100)->nullable();
            $table->date('inspection_date')->nullable();
            $table->string('iar_number', 50)->nullable();
            $table->date('date_forwarded_to_finance')->nullable();
            $table->date('receipt_receiving_date')->nullable();
            $table->string('receipt_claimed_by', 100)->nullable();
            $table->date('items_receiving_date')->nullable();
            $table->string('items_claimed_by', 100)->nullable();
            $table->text('notify_receipt')->nullable();
            $table->text('notify_call')->nullable();
            $table->text('notify_email')->nullable();
            $table->string('status', 50)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('po_number', 'fk_pir_po_number')
                ->references('po_number')->on('serve_po')
                ->restrictOnDelete();

            $table->foreign('fund_cluster', 'fk_pir_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pir_monitoring');
    }
};