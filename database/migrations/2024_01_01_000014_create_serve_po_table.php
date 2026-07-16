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
            $table->date('po_date')->nullable();
            $table->date('po_received_date')->nullable();
            $table->string('inclusive_date', 100)->nullable();
            $table->date('due_date')->nullable();
            $table->string('pr_number', 50)->nullable();
            $table->date('pr_date')->nullable();
            $table->string('philgeps_reference_no', 50)->nullable();
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
                ->constrained('supplier_list')
                ->nullOnDelete();

            $table->string('end_user', 150)->nullable();
            $table->date('date_forwarded_to_smu')->nullable();
            $table->date('coa_processed_date')->nullable();
            $table->date('date_forwarded_frontdesk')->nullable();
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
