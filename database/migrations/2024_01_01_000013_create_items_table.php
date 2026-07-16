<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id('stockID');
            $table->string('stock_no', 50)->unique();
            $table->string('item_name', 150);
            $table->string('description', 255)->nullable();

            $table->foreignId('unitID')
                ->constrained('units', 'unitID')
                ->restrictOnDelete();

            // String FK to stock_items(stock_no) — not an integer id, so
            // declared manually rather than via foreignId()->constrained().
            $table->foreign('stock_no', 'fk_items_stock')
                ->references('stock_no')->on('stock_items')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
