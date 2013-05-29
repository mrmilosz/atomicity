#!/usr/bin/perl -wT 

use strict;
use CGI qw(standard -utf8);
use CGI::Carp qw(fatalsToBrowser);

my $cgi = new CGI();
print $cgi->header();

my $upload_dir = 'xml';

my $destination_dir = $cgi->url_param('destination');
if (defined $destination_dir) {
	if ($destination_dir =~ /^([-\/\@\w.]+)$/) {
		$upload_dir = $1;
	}
	else {
		die "Bad filename";
	}
}

use Data::Dumper;
print Dumper($upload_dir);

my %filenames = ();

for my $filename ($cgi->param()) {
	if ($filename =~ /^([-\@\w.]+)$/) {
		$filename = $1;
	}
	else {
		die "Bad filename";
	}

	open (DESTINATION_FILE, ">$upload_dir/$filename") or die "$!";
	binmode DESTINATION_FILE;
	print DESTINATION_FILE $cgi->param($filename);
	close DESTINATION_FILE;
}
