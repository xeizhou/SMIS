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
        Schema::create('pir_inspection_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pir_id');
            $table->string('iar_number')->nullable();
            $table->string('inspected_by')->nullable();
            $table->date('inspection_date')->nullable();
            $table->timestamps();

            $table->foreign('pir_id')->references('pir_id')->on('pir_monitoring')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pir_inspection_entries');
    }
};
