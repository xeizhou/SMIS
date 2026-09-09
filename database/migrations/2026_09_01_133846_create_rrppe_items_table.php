<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create the new items table
        Schema::create('rrppe_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rrppe_monitoring_id');

            $table->string('stock_no', 50)->nullable();

            $table->string('item_name')->nullable();
            $table->text('item_description')->nullable();
            $table->integer('quantity')->nullable();
            $table->string('property_no', 50)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('status', 50)->nullable();
            $table->string('area', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('rrppe_monitoring_id')
                  ->references('id')
                  ->on('rrppe_monitoring')
                  ->onDelete('cascade');

            $table->foreign('stock_no')
                  ->references('stock_no')
                  ->on('stock_items')
                  ->nullOnDelete();
        });


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rrppe_items');
    }
};