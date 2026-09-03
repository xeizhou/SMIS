<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Import extends Model
{
    protected $fillable = [
        'user_id',
        'file_path',
        'status',
        'total_rows',
        'processed_rows',
        'created_rows',
        'updated_rows',
        'skipped_rows',
        'error_message',
    ];
}