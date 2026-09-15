<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_inspection_entries', function (Blueprint $table) {
            $table->id();
            $table->string('po_number', 50);
            $table->string('iar_number', 100)->nullable();
            $table->string('inspected_by', 255)->nullable();
            $table->date('inspection_date')->nullable();
            $table->timestamps();

            $table->foreign('po_number')->references('po_number')->on('serve_po')->cascadeOnUpdate()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_inspection_entries');
    }
};
