<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX: same id-vs-PK issue. `id` is the true auto-increment
     * PK; the original composite PK (rrppe_no, property_no) becomes a
     * UNIQUE constraint instead.
     */
    public function up(): void
    {
        Schema::create('rrppe_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('rrppe_no', 50)->unique();
            $table->date('date_received');
            $table->string('end_user_name', 100)->nullable();
            $table->string('return_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rrppe_monitoring');
    }
};
