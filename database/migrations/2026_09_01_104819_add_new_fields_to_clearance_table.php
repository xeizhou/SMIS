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
        Schema::table('clearance', function (Blueprint $table) {
            $table->string('clearance_type', 100)->nullable();
            $table->string('form_attribute', 100)->nullable();
            $table->string('end_user_claim', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clearance', function (Blueprint $table) {
            $table->dropColumn(['clearance_type', 'form_attribute', 'end_user_claim']);
        });
    }
};
