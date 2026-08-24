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
        Schema::create('delivery_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_id');
            $table->string('notice_type');
            $table->timestamp('follow_up_date');
            $table->timestamps();

            $table->foreign('delivery_id')->references('delivery_id')->on('delivery')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_follow_ups');
    }
};
