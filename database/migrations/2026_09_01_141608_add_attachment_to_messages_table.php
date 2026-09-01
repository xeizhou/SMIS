<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('body');
            $table->string('attachment_name')->nullable()->after('attachment_path');
            $table->string('attachment_type')->nullable()->after('attachment_name'); // mime type
            $table->unsignedBigInteger('attachment_size')->nullable()->after('attachment_type'); // bytes
            $table->text('body')->nullable()->change(); // allow attachment-only messages
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'attachment_name', 'attachment_type', 'attachment_size']);
            $table->text('body')->nullable(false)->change();
        });
    }
};