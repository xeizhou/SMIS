<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->string('stock_no', 50)->primary();
            $table->string('item_name', 100);
            $table->string('description', 255)->nullable();

            $table->foreignId('unitID')->nullable()
                ->constrained('units', 'unitID')
                ->nullOnDelete();

            $table->string('link', 500)->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};