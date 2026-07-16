<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery', function (Blueprint $table) {
            $table->string('delivery_id', 50)->primary();

            $table->string('po_number', 50)->nullable();

            $table->foreignId('supplier_id')->nullable()
                ->constrained('supplier_list')
                ->nullOnDelete();

            $table->date('delivery_date')->nullable();
            $table->date('po_date_received')->nullable();
            $table->string('delivery_term', 100)->nullable();
            $table->date('due_date')->nullable();
            $table->integer('no_of_days_ld')->default(0);
            $table->string('received_by_1', 150)->nullable();
            $table->string('received_by_2', 150)->nullable();
            $table->string('end_user', 150)->nullable();
            $table->string('place_of_delivery', 255)->nullable();
            $table->string('status', 50)->nullable();
            $table->text('remarks')->nullable();
            $table->dateTime('data_entry_timestamp')->useCurrent();
            $table->decimal('total_amount_delivered', 15, 2)->default(0);
            $table->decimal('po_total_amount', 15, 2)->default(0);
            $table->string('folder_link', 500)->nullable();

            $table->foreign('po_number', 'fk_delivery_po_number')
                ->references('po_number')->on('serve_po')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery');
    }
};
