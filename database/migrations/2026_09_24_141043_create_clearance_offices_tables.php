<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clearance_offices', function (Blueprint $table) {
            $table->id();
            $table->string('clearance_office_name', 100)->unique();
            $table->timestamps();
        });

        Schema::create('clearance_clearance_office', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clearance_id');
            $table->unsignedBigInteger('clearance_office_id');

            $table->foreign('clearance_id')
                ->references('clearance_id')->on('clearance')
                ->cascadeOnDelete();
            $table->foreign('clearance_office_id')
                ->references('id')->on('clearance_offices')
                ->cascadeOnDelete();

            $table->unique(['clearance_id', 'clearance_office_id']);
        });

        Schema::table('clearance', function (Blueprint $table) {
            if (DB::getDriverName() === 'sqlite') {
                $table->dropForeign(['office']);
            } else {
                $table->dropForeign('fk_clearance_office');
            }
            $table->dropColumn('office');
        });
    }

    public function down(): void
    {
        Schema::table('clearance', function (Blueprint $table) {
            $table->string('office', 20)->nullable()->after('name');
            $table->foreign('office', 'fk_clearance_office')
                ->references('office_code')->on('offices')
                ->restrictOnDelete();
        });

        Schema::dropIfExists('clearance_clearance_office');
        Schema::dropIfExists('clearance_offices');
    }
};