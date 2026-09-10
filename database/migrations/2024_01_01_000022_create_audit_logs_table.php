<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id('auditLogID');
            $table->dateTime('log_timestamp');

            $table->foreignId('userID')
                ->constrained('users', 'id')
                ->restrictOnDelete();

            $table->string('role', 50)->nullable();
            $table->string('action', 500);
            $table->string('target_url', 1000)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
