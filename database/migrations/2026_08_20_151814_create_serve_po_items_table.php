<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serve_po_items', function (Blueprint $table) {
            $table->id();
            $table->string('po_number');
            $table->string('stock_no');
            $table->timestamps();

            $table->foreign('po_number')
                ->references('po_number')->on('serve_po')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreign('stock_no')
                ->references('stock_no')->on('stock_items')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->unique(['po_number', 'stock_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serve_po_items');
    }
};